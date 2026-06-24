"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeExpenseBarProps {
  data: MonthlyData[];
}

export function IncomeExpenseBar({ data }: IncomeExpenseBarProps) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(217 33% 18%)" />
          <XAxis dataKey="month" tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 18%)", borderRadius: 8 }}
            labelStyle={{ color: "hsl(210 40% 92%)", fontSize: 12, fontWeight: 600 }}
            formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: "hsl(215 16% 55%)", fontSize: 11 }}>
                {value === "income" ? "Income" : "Expenses"}
              </span>
            )}
          />
          <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
