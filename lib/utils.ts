import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatCurrencySigned(amount: number, currency = "USD"): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(abs);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function getPeriodDates(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  switch (period) {
    case "1m":
      return {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
        label: "Last Month",
      };
    case "3m":
      return {
        start: startOfMonth(subMonths(now, 3)),
        end: now,
        label: "Last 3 Months",
      };
    case "6m":
      return {
        start: startOfMonth(subMonths(now, 6)),
        end: now,
        label: "Last 6 Months",
      };
    case "12m":
      return {
        start: startOfMonth(subMonths(now, 12)),
        end: now,
        label: "Last 12 Months",
      };
    case "ytd":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
        label: "Year to Date",
      };
    case "30d":
    default:
      return {
        start: subDays(now, 30),
        end: now,
        label: "Last 30 Days",
      };
  }
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.75) return "Medium";
  if (confidence >= 0.5) return "Low";
  return "Very Low";
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-green-400";
  if (confidence >= 0.75) return "text-yellow-400";
  if (confidence >= 0.5) return "text-orange-400";
  return "text-red-400";
}

export function confidenceBg(confidence: number): string {
  if (confidence >= 0.9) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (confidence >= 0.75) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (confidence >= 0.5) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatMonth(date: Date | string): string {
  return format(new Date(date), "MMM yyyy");
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
