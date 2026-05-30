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
    return <ArrowUpRight className="h-3 w-3 text-emerald-600" />;
  if (b.direction === "down")
    return <ArrowDownRight className="h-3 w-3 text-rose-600" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
          Summary of this report
        </h3>
      </div>

      {/* The main narrative paragraph — human-readable, same wording template
          across all projects, with stats filled from the actual data. */}
      <p className="text-base leading-relaxed text-foreground">
        {summary.narrative}
      </p>

      {/* Compact stat chips underneath so the reader can scan exact numbers
          at a glance without leaving the paragraph. */}
      {summary.bullets.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-primary/10 pt-3">
          {summary.bullets.map((b) => {
            const sign =
              b.changePct == null ? "" : b.changePct >= 0 ? "+" : "";
            const pctStr =
              b.changePct == null ? "—" : `${sign}${b.changePct.toFixed(1)}%`;
            return (
              <div
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-muted-foreground">
                  {b.label}
                </span>
                <span className="font-semibold text-foreground">
                  {formatBulletValue(b)}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-0.5",
                    colorFor(b.direction),
                  )}
                >
                  {arrowFor(b)}
                  {pctStr}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
