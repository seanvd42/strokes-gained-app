import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subvalue?: string;
  trend?: { value: number; label: string };
  color?: "default" | "green" | "red" | "yellow";
  className?: string;
}

export function StatCard({ label, value, subvalue, trend, color = "default", className }: StatCardProps) {
  const valueColors = {
    default: "text-foreground",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className={cn("bg-card border border-border rounded-xl p-5", className)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={cn("text-2xl font-bold mt-1.5 tracking-tight", valueColors[color])}>{value}</p>
      {subvalue && <p className="text-xs text-muted-foreground mt-0.5">{subvalue}</p>}
      {trend && (
        <p className={cn("text-xs mt-2 font-medium", trend.value >= 0 ? "text-red-400" : "text-green-400")}>
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}
