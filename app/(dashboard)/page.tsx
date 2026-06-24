import { db } from "@/lib/db";
import {
  transactions,
  transactionCategorizations,
  categories,
  accounts,
} from "@/drizzle/schema";
import { eq, and, gte, lte, isNull, desc } from "drizzle-orm";
import { formatCurrency, getPeriodDates } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { IncomeExpenseBar } from "@/components/charts/IncomeExpenseBar";
import { SpendingDonut } from "@/components/charts/SpendingDonut";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const { start: s3, end: e3 } = getPeriodDates("3m");
  const { start: s1, end: e1 } = getPeriodDates("1m");

  const [txs3m, reviewItems, allAccounts, recentTxns] = await Promise.all([
    db
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
      .where(and(gte(transactions.date, s3), lte(transactions.date, e3))),

    db
      .select({
        id: transactionCategorizations.id,
        confidence: transactionCategorizations.confidence,
        txId: transactions.id,
        txDescription: transactions.description,
        txAmount: transactions.amount,
        txDate: transactions.date,
        catName: categories.name,
        catColor: categories.color,
      })
      .from(transactionCategorizations)
      .innerJoin(transactions, eq(transactionCategorizations.transactionId, transactions.id))
      .innerJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
      .where(and(eq(transactionCategorizations.needsReview, true), isNull(transactionCategorizations.reviewedAt)))
      .orderBy(transactionCategorizations.confidence)
      .limit(5),

    db.select().from(accounts),

    db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        description: transactions.description,
        catName: categories.name,
        catColor: categories.color,
      })
      .from(transactions)
      .leftJoin(transactionCategorizations, eq(transactions.id, transactionCategorizations.transactionId))
      .leftJoin(categories, eq(transactionCategorizations.categoryId, categories.id))
      .where(gte(transactions.date, s1))
      .orderBy(desc(transactions.date))
      .limit(8),
  ]);

  const income3m = txs3m.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses3m = txs3m.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const income1m = txs3m.filter((t) => t.amount > 0 && t.date >= s1).reduce((s, t) => s + t.amount, 0);
  const expenses1m = txs3m.filter((t) => t.amount < 0 && t.date >= s1).reduce((s, t) => s + Math.abs(t.amount), 0);

  const catMap: Record<string, { amount: number; color: string }> = {};
  for (const tx of txs3m) {
    if (tx.amount >= 0) continue;
    const name = tx.categoryName || "Uncategorized";
    const color = tx.categoryColor || "#6b7280";
    if (!catMap[name]) catMap[name] = { amount: 0, color };
    catMap[name].amount += Math.abs(tx.amount);
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const months = eachMonthOfInterval({ start: s3, end: new Date() });
  const monthlyTrend = months.map((month) => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const mTxs = txs3m.filter((t) => t.date >= ms && t.date <= me);
    return {
      month: format(month, "MMM yy"),
      income: mTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expenses: mTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    };
  });

  const totalBalance = allAccounts.reduce((s, a) => s + a.balance, 0);

  return {
    income3m, expenses3m, income1m, expenses1m,
    net1m: income1m - expenses1m,
    totalBalance,
    categoryBreakdown,
    monthlyTrend,
    reviewItems,
    recentTxns,
    accounts: allAccounts,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 3 months</p>
        </div>
        <Link href="/settings" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg bg-secondary transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Cash Flow" value={formatCurrency(Math.abs(data.net1m))} subvalue="This month" color={data.net1m >= 0 ? "green" : "red"} />
        <StatCard label="Total Income" value={formatCurrency(data.income3m)} subvalue="Last 3 months" color="green" />
        <StatCard label="Total Expenses" value={formatCurrency(data.expenses3m)} subvalue="Last 3 months" color="red" />
        <StatCard label="Account Balance" value={formatCurrency(Math.abs(data.totalBalance))} subvalue={`${data.accounts.length} accounts`} color={data.totalBalance >= 0 ? "default" : "red"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Income vs Expenses</h3>
          <IncomeExpenseBar data={data.monthlyTrend} />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Spending Breakdown (3 months)</h3>
          <SpendingDonut data={data.categoryBreakdown} total={data.expenses3m} />
        </div>
      </div>

      {data.reviewItems.length > 0 && (
        <div className="bg-card border border-yellow-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-foreground">Needs Your Review</h3>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{data.reviewItems.length} items</span>
            </div>
            <Link href="/categories?tab=review" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.reviewItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{item.txDescription}</p>
                  <p className="text-xs text-muted-foreground">{format(item.txDate, "MMM d")}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <CategoryBadge name={item.catName || "?"} color={item.catColor || "#6b7280"} />
                  <ConfidenceBadge confidence={item.confidence || 0} showIcon />
                  <span className={`${item.txAmount >= 0 ? "text-green-400" : "text-red-400"} text-sm font-medium`}>
                    {item.txAmount >= 0 ? "+" : ""}{formatCurrency(item.txAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
          <Link href="/transactions" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="space-y-1">
          {data.recentTxns.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ backgroundColor: `${tx.catColor || "#6b7280"}25`, color: tx.catColor || "#6b7280" }}
                >
                  {(tx.catName || "?")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{format(tx.date, "MMM d")} · {tx.catName || "Uncategorized"}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold flex-shrink-0 ml-3 ${tx.amount >= 0 ? "text-green-400" : "text-foreground"}`}>
                {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
