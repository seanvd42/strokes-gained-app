import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionCategorizations, categories, accounts } from "@/drizzle/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select({
      id: transactionCategorizations.id,
      confidence: transactionCategorizations.confidence,
      aiExplanation: transactionCategorizations.aiExplanation,
      txId: transactions.id,
      txDescription: transactions.description,
      txAmount: transactions.amount,
      txDate: transactions.date,
      accountName: accounts.name,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactionCategorizations)
    .innerJoin(transactions, eq(transactionCategorizations.transactionId, transactions.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
    .where(
      and(
        eq(transactionCategorizations.needsReview, true),
        isNull(transactionCategorizations.reviewedAt)
      )
    )
    .orderBy(asc(transactionCategorizations.confidence))
    .limit(50);

  const shaped = items.map((r) => ({
    id: r.id,
    confidence: r.confidence,
    aiExplanation: r.aiExplanation,
    transaction: { id: r.txId, description: r.txDescription, amount: r.txAmount, date: r.txDate, account: { name: r.accountName } },
    category: { id: r.categoryId, name: r.categoryName, color: r.categoryColor },
  }));

  return NextResponse.json(shaped);
}
