import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionCategorizations, categories, accounts } from "@/drizzle/schema";
import { eq, and, gte, lte, like, desc, ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const category = searchParams.get("category");
  const needsReview = searchParams.get("needsReview");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const accountId = searchParams.get("accountId");

  const conditions = [];
  if (start) conditions.push(gte(transactions.date, new Date(start)));
  if (end) conditions.push(lte(transactions.date, new Date(end)));
  if (accountId) conditions.push(eq(transactions.accountId, accountId));
  if (search) conditions.push(ilike(transactions.description, `%${search}%`));

  const catConditions = [];
  if (category) catConditions.push(eq(categories.name, category));
  if (needsReview === "true") {
    catConditions.push(eq(transactionCategorizations.needsReview, true));
    catConditions.push(sql`${transactionCategorizations.reviewedAt} IS NULL`);
  }

  const allConditions = [...conditions, ...(catConditions.length > 0 ? catConditions : [])];

  const rows = await db
    .select({
      id: transactions.id,
      simplefinId: transactions.simplefinId,
      accountId: transactions.accountId,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      pending: transactions.pending,
      notes: transactions.notes,
      accountName: accounts.name,
      catId: transactionCategorizations.id,
      confidence: transactionCategorizations.confidence,
      method: transactionCategorizations.method,
      needsReview: transactionCategorizations.needsReview,
      reviewedAt: transactionCategorizations.reviewedAt,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
    .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
    .where(allConditions.length > 0 ? and(...allConditions) : undefined)
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
    .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
    .where(allConditions.length > 0 ? and(...allConditions) : undefined);

  const shaped = rows.map((r) => ({
    id: r.id,
    date: r.date,
    amount: r.amount,
    description: r.description,
    pending: r.pending,
    notes: r.notes,
    account: { id: r.accountId, name: r.accountName },
    categorization: r.catId ? {
      confidence: r.confidence,
      method: r.method,
      needsReview: r.needsReview,
      reviewedAt: r.reviewedAt,
      category: { id: r.categoryId, name: r.categoryName, color: r.categoryColor },
    } : null,
  }));

  return NextResponse.json({ transactions: shaped, total: Number(count), page, limit });
}
