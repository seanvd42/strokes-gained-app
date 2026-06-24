"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface SpendingDonutProps {
  data: Array<{ name: string; amount: number; color: string }>;
  total: number;
}

export function SpendingDonut({ data, total }: SpendingDonutProps) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  const top8 = data.slice(0, 8);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={top8}
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="75%"
            dataKey="amount"
            paddingAngle={2}
          >
            {top8.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 18%)", borderRadius: 8 }}
            labelStyle={{ color: "hsl(210 40% 92%)", fontSize: 12 }}
            formatter={(value: number) => [formatCurrency(value), ""]}
          />
          <Legend
            formatter={(value) => <span style={{ color: "hsl(215 16% 55%)", fontSize: 11 }}>{value}</span>}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
