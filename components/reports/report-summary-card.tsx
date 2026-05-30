"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatBulletValue,
  type ReportSummary,
  type SummaryBullet,
} from "@/lib/report-summary";

type Props = {
  summary: ReportSummary;
};

function arrowFor(b: SummaryBullet) {
  if (b.direction === "up")
    return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />;
  if (b.direction === "down")
    return <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function colorFor(direction: SummaryBullet["direction"]) {
  if (direction === "up") return "text-emerald-700 dark:text-emerald-400";
  if (direction === "down") return "text-rose-700 dark:text-rose-400";
  return "text-muted-foreground";
}

export function ReportSummaryCard({ summary }: Props) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
            Summary of this report
          </h3>
        </div>
      </div>
      <p className="mb-4 text-base font-medium leading-snug text-foreground">
        {summary.headline}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {summary.bullets.map((b) => {
          const sign =
            b.changePct == null ? "" : b.changePct >= 0 ? "+" : "";
          const pctStr =
            b.changePct == null ? "—" : `${sign}${b.changePct.toFixed(1)}%`;
          return (
            <li
              key={b.label}
              className="flex items-baseline justify-between gap-3 rounded-md border bg-background/60 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{b.label}</span>
              <span className="flex items-center gap-2 font-semibold">
                <span className="text-foreground">{formatBulletValue(b)}</span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs",
                    colorFor(b.direction),
                  )}
                >
                  {arrowFor(b)}
                  {pctStr}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
