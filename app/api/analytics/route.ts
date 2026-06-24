import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, transactionCategorizations, categories } from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getPeriodDates } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "3m";
  const { start, end } = getPeriodDates(period);

  const txs = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      description: transactions.description,
      confidence: transactionCategorizations.confidence,
      needsReview: transactionCategorizations.needsReview,
      reviewedAt: transactionCategorizations.reviewedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
    .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
    .where(and(gte(transactions.date, start), lte(transactions.date, end)));

  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const txCount = txs.length;
  const reviewCount = txs.filter((t) => t.needsReview && !t.reviewedAt).length;

  const catMap: Record<string, { amount: number; count: number; color: string }> = {};
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const name = tx.categoryName || "Uncategorized";
    const color = tx.categoryColor || "#6b7280";
    if (!catMap[name]) catMap[name] = { amount: 0, count: 0, color };
    catMap[name].amount += Math.abs(tx.amount);
    catMap[name].count++;
  }

  const categoryBreakdown = Object.entries(catMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const months = eachMonthOfInterval({ start, end });
  const monthlyTrend = months.map((month) => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const mTxs = txs.filter((t) => t.date >= ms && t.date <= me);
    return {
      month: format(month, "MMM yy"),
      income: mTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expenses: mTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    };
  });

  // Outlier detection vs previous same-length period
  const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const prevTxs = await db
    .select({
      amount: transactions.amount,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
    .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
    .where(and(gte(transactions.date, prevStart), lte(transactions.date, start)));

  const prevCatMap: Record<string, number> = {};
  for (const tx of prevTxs) {
    if (tx.amount >= 0) continue;
    const name = tx.categoryName || "Uncategorized";
    prevCatMap[name] = (prevCatMap[name] || 0) + Math.abs(tx.amount);
  }

  const outliers = categoryBreakdown
    .filter((cat) => {
      const prev = prevCatMap[cat.name];
      if (!prev || prev < 10) return false;
      return (cat.amount - prev) / prev > 0.3;
    })
    .map((cat) => ({
      name: cat.name,
      amount: cat.amount,
      prevAmount: prevCatMap[cat.name],
      pctChange: ((cat.amount - prevCatMap[cat.name]) / prevCatMap[cat.name]) * 100,
      color: cat.color,
    }))
    .sort((a, b) => b.pctChange - a.pctChange)
    .slice(0, 5);

  const merchantMap: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    merchantMap[tx.description] = (merchantMap[tx.description] || 0) + Math.abs(tx.amount);
  }
  const topMerchants = Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }));

  return NextResponse.json({
    overview: { income, expenses, netFlow: income - expenses, txCount, reviewCount },
    categoryBreakdown,
    monthlyTrend,
    outliers,
    topMerchants,
    period: { start, end },
  });
}
