"use client";

import { AlertTriangle, EyeOff, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeltaCell } from "./delta-cell";
import { formatNumber } from "@/lib/utils";
import { GMB_METRICS } from "@/lib/google/gmb-metrics";
import type { GmbPerformance } from "@/lib/google/types";

type Props = {
  performance: GmbPerformance;
  prev?: GmbPerformance | null;
  // The project has a Business Profile location selected (so this is real data,
  // not just a sample). Drives the "sample data" banner.
  connected: boolean;
  editing?: boolean;
  onHide?: () => void;
};

export function GmbSection({
  performance,
  prev,
  connected,
  editing = false,
  onHide,
}: Props) {
  const isSample = !connected || performance.source === "stub";
  return (
    <section data-pptx-slide>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Google Business Profile</h3>
            <p className="text-xs text-muted-foreground">
              Maps &amp; Search listing performance over the selected period.
            </p>
          </div>
        </div>
        {editing && onHide ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive print:hidden"
            onClick={onHide}
            aria-label="Hide section"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {isSample ? (
        <Card className="mb-2 border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 print:hidden">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {!connected
                ? "Sample data — connect Google Business Profile and pick a location in project settings to load live numbers."
                : performance.error ??
                  "Business Profile is connected but the data call returned sample numbers."}
            </span>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GMB_METRICS.map((m) => {
          const cur = performance.totals[m.key] ?? 0;
          const previous = prev?.totals[m.key];
          return (
            <Card key={m.key} className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {m.label}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums">
                  {formatNumber(cur)}
                </span>
                {previous != null ? (
                  <DeltaCell current={cur} previous={previous} />
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
