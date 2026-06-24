import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  accounts,
  transactions,
  transactionCategorizations,
  categories,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { fetchAccounts, parseSimpleFinDate } from "@/lib/simplefin";
import { categorizeTransactions, applyRules } from "@/lib/ai";
import { subMonths } from "date-fns";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) return NextResponse.json({ error: "SimpleFin not configured" }, { status: 400 });

  try {
    const startDate = subMonths(new Date(), 6);
    const sfData = await fetchAccounts(accessUrl, startDate);

    if (sfData.errors?.length > 0) return NextResponse.json({ error: sfData.errors.join(", ") }, { status: 400 });

    const allCategories = await db.select().from(categories);
    const categoryNames = allCategories.map((c) => c.name);
    const categoryMap = Object.fromEntries(allCategories.map((c) => [c.name, c.id]));

    let newTransactions = 0;
    let newAccounts = 0;

    for (const sfAccount of sfData.accounts) {
      const [existing] = await db.select().from(accounts).where(eq(accounts.simplefinId, sfAccount.id)).limit(1);

      let accountId: string;
      if (!existing) {
        const [created] = await db.insert(accounts).values({
          simplefinId: sfAccount.id,
          name: sfAccount.name,
          org: sfAccount.org.name,
          currency: sfAccount.currency,
          balance: parseFloat(sfAccount.balance),
        }).returning();
        accountId = created.id;
        newAccounts++;
      } else {
        accountId = existing.id;
        await db.update(accounts).set({ balance: parseFloat(sfAccount.balance), lastSync: new Date() }).where(eq(accounts.id, accountId));
      }

      const uncategorized: Array<{ id: string; description: string; amount: number }> = [];

      for (const sfTx of sfAccount.transactions) {
        const [existingTx] = await db.select().from(transactions).where(eq(transactions.simplefinId, sfTx.id)).limit(1);
        if (existingTx) continue;

        const [tx] = await db.insert(transactions).values({
          simplefinId: sfTx.id,
          accountId,
          date: parseSimpleFinDate(sfTx.posted),
          amount: parseFloat(sfTx.amount),
          description: sfTx.description,
          pending: sfTx.pending || false,
        }).returning();

        newTransactions++;

        const ruleMatch = await applyRules(sfTx.description);
        if (ruleMatch) {
          await db.insert(transactionCategorizations).values({
            transactionId: tx.id,
            categoryId: ruleMatch.categoryId,
            confidence: 0.99,
            method: "RULE",
            needsReview: false,
          });
        } else {
          uncategorized.push({ id: tx.id, description: sfTx.description, amount: parseFloat(sfTx.amount) });
        }
      }

      if (uncategorized.length > 0) {
        const batchSize = 20;
        for (let i = 0; i < uncategorized.length; i += batchSize) {
          const batch = uncategorized.slice(i, i + batchSize);
          const results = await categorizeTransactions(batch, categoryNames);
          for (const [txId, result] of Object.entries(results)) {
            const catId = categoryMap[result.categoryName] || categoryMap["Uncategorized"];
            if (catId) {
              await db.insert(transactionCategorizations).values({
                transactionId: txId,
                categoryId: catId,
                confidence: result.confidence,
                method: "AI",
                aiExplanation: result.explanation,
                needsReview: result.needsReview,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, newAccounts, newTransactions });
  } catch (e) {
    console.error("Sync error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}
