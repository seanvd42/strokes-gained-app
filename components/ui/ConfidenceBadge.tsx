import { cn, confidenceBg, confidenceLabel } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence: number;
  showIcon?: boolean;
  className?: string;
}

export function ConfidenceBadge({ confidence, showIcon = false, className }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const isLow = confidence < 0.75;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        confidenceBg(confidence),
        className
      )}
    >
      {showIcon && isLow && <AlertCircle className="w-3 h-3" />}
      {pct}%
    </span>
  );
}
