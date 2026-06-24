"use client";

import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "12m", label: "12 Months" },
  { value: "ytd", label: "YTD" },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex bg-secondary rounded-lg p-1 gap-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            value === p.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
