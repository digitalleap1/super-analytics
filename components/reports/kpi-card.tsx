import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn, formatDelta } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  current: number;
  previous?: number;
  invertDelta?: boolean; // for position (lower is better)
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "navy" | "muted";
};

const ACCENT_BAR: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/80",
  navy: "bg-[hsl(230_52%_35%)]",
  muted: "bg-muted-foreground/40",
};

const ACCENT_TINT: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  navy: "bg-[hsl(230_52%_35%)]/10 text-[hsl(230_52%_35%)] dark:text-[hsl(230_60%_75%)]",
  muted: "bg-muted text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  current,
  previous,
  invertDelta = false,
  hint,
  icon: Icon,
  accent = "primary",
}: Props) {
  const showDelta = previous !== undefined;
  const delta = showDelta ? formatDelta(current, previous) : null;
  const isGood = delta
    ? invertDelta
      ? !delta.isPositive
      : delta.isPositive
    : null;

  return (
    <Card className="relative overflow-hidden p-5 hover:shadow-md">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 left-0 w-[3px] rounded-r-full",
          ACCENT_BAR[accent],
        )}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              ACCENT_TINT[accent],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 pl-2">
        {delta && current === previous ? (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Minus className="mr-1 h-3 w-3" />
            no change
          </span>
        ) : delta ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              isGood
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
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
        {showDelta ? (
          <span className="text-[10px] text-muted-foreground">
            vs prev period
          </span>
        ) : null}
        {hint ? (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </Card>
  );
}
