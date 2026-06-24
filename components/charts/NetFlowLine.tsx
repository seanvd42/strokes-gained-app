"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface NetFlowLineProps {
  data: Array<{ month: string; income: number; expenses: number }>;
}

export function NetFlowLine({ data }: NetFlowLineProps) {
  const chartData = data.map((d) => ({ month: d.month, net: d.income - d.expenses }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(217 33% 18%)" />
          <XAxis dataKey="month" tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "hsl(215 16% 55%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 18%)", borderRadius: 8 }}
            formatter={(value: number) => [formatCurrency(Math.abs(value)), value >= 0 ? "Surplus" : "Deficit"]}
          />
          <ReferenceLine y={0} stroke="hsl(217 33% 28%)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
