"use client";

import { Globe } from "lucide-react";

type Props = {
  name: string;
  domain: string;
  logoUrl?: string | null;
  rangeLabel: string;
  reportPeriodLabel: string;
};

// Logo + project name + period block that sits at the very top of every
// report (live, PDF, PPT, public share). Designed to render well in both
// screen mode and in a captured image (no client-only effects).
export function ReportLogoHeader({
  name,
  domain,
  logoUrl,
  rangeLabel,
  reportPeriodLabel,
}: Props) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 sm:h-16 sm:w-16">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="h-full w-full object-contain"
            crossOrigin="anonymous"
          />
        ) : (
          <Globe className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {reportPeriodLabel}
        </p>
        <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
          {name}
        </h1>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          {domain} &middot; {rangeLabel}
        </p>
      </div>
    </div>
  );
}
