import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatDelta } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  current: number;
  previous?: number;
  invertDelta?: boolean; // for position (lower is better)
  hint?: string;
};

export function KpiCard({
  label,
  value,
  current,
  previous,
  invertDelta = false,
  hint,
}: Props) {
  const showDelta = previous !== undefined;
  const delta = showDelta ? formatDelta(current, previous) : null;
  const isGood = delta ? (invertDelta ? !delta.isPositive : delta.isPositive) : null;

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && current === previous ? (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <Minus className="mr-1 h-3 w-3" />
            no change
          </span>
        ) : delta ? (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium",
              isGood
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {delta.isPositive ? (
              <ArrowUp className="mr-0.5 h-3 w-3" />
            ) : (
              <ArrowDown className="mr-0.5 h-3 w-3" />
            )}
            {delta.label}
          </span>
        ) : null}
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </Card>
  );
}
