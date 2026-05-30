"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  current: number;
  previous: number | null | undefined;
  // For position-style metrics, lower is better — flip arrow colours.
  invert?: boolean;
};

// Compact "+12%" / "-4%" / "—" indicator that sits next to a metric cell.
// Mirrors the visual treatment of the summary card's bullets so users see the
// same up/down semantics everywhere.
export function DeltaCell({ current, previous, invert = false }: Props) {
  if (previous == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (previous === 0) {
    if (current === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    // Treat as "new" — show a +new tag instead of arbitrary infinity %.
    const direction = invert ? "down" : "up";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium",
          direction === "up"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        new
      </span>
    );
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;

  let direction: "up" | "down" | "flat";
  if (Math.abs(rounded) < 0.5) {
    direction = "flat";
  } else if (rounded > 0) {
    direction = invert ? "down" : "up";
  } else {
    direction = invert ? "up" : "down";
  }

  const color =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  const sign = rounded > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        color,
      )}
    >
      <Icon className="h-3 w-3" />
      {sign}
      {rounded.toFixed(1)}%
    </span>
  );
}
