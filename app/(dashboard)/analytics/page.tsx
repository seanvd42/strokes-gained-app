"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { StatCard } from "@/components/ui/StatCard";
import { SpendingDonut } from "@/components/charts/SpendingDonut";
import { IncomeExpenseBar } from "@/components/charts/IncomeExpenseBar";
import { NetFlowLine } from "@/components/charts/NetFlowLine";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface AnalyticsData {
  overview: {
    income: number;
    expenses: number;
    netFlow: number;
    txCount: number;
    reviewCount: number;
  };
  categoryBreakdown: Array<{ name: string; amount: number; count: number; color: string }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
  outliers: Array<{ name: string; amount: number; prevAmount: number; pctChange: number; color: string }>;
  topMerchants: Array<{ name: string; amount: number }>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("3m");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [period]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Spending patterns and trends</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Income" value={formatCurrency(data.overview.income)} color="green" />
            <StatCard label="Total Expenses" value={formatCurrency(data.overview.expenses)} color="red" />
            <StatCard
              label="Net Flow"
              value={formatCurrency(Math.abs(data.overview.netFlow))}
              color={data.overview.netFlow >= 0 ? "green" : "red"}
              subvalue={data.overview.netFlow >= 0 ? "Surplus" : "Deficit"}
            />
            <StatCard
              label="Transactions"
              value={String(data.overview.txCount)}
              subvalue={`Avg ${formatCurrency(data.overview.expenses / Math.max(1, data.overview.txCount))} each`}
            />
          </div>

          {/* Outliers */}
          {data.outliers.length > 0 && (
            <div className="bg-card border border-orange-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-foreground">Outsized Spending</h3>
                <span className="text-xs text-muted-foreground">vs previous period</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.outliers.map((o) => (
                  <div key={o.name} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                      <span className="text-sm font-medium text-foreground">{o.name}</span>
                    </div>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(o.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      vs {formatCurrency(o.prevAmount)} · <span className="text-orange-400">+{o.pctChange.toFixed(0)}%</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Income vs Expenses</h3>
              <IncomeExpenseBar data={data.monthlyTrend} />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Spending by Category</h3>
              <SpendingDonut data={data.categoryBreakdown} total={data.overview.expenses} />
            </div>
          </div>

          {/* Net flow trend */}
          {data.monthlyTrend.length > 1 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Net Cash Flow Trend</h3>
              <NetFlowLine data={data.monthlyTrend} />
            </div>
          )}

          {/* Category table + Top merchants */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h3>
              <div className="space-y-2">
                {data.categoryBreakdown.slice(0, 10).map((cat) => {
                  const pct = data.overview.expenses > 0 ? (cat.amount / data.overview.expenses) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-foreground">{cat.name}</span>
                          <span className="text-xs text-muted-foreground">{cat.count} txns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          <span className="text-foreground font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top Merchants</h3>
              <div className="space-y-2">
                {data.topMerchants.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{m.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground ml-3">{formatCurrency(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
