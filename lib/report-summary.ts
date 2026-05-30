// Auto-generated executive summary for the top of a report.
//
// Compares the current period to the previous period and produces:
//   - one headline sentence
//   - 4-6 bullets, each describing one metric's movement in % terms.
//
// Output is deterministic — same inputs always give the same text, so the
// same date range looks identical across reloads and matches the saved
// snapshot.

import type { Ga4Overview, GscOverview } from "@/lib/google/types";

export type SummaryDirection = "up" | "down" | "flat";

export type SummaryBullet = {
  label: string; // "Organic clicks"
  current: number;
  previous: number | null;
  direction: SummaryDirection;
  // null when there's no previous period to compare
  changePct: number | null;
  // For position only: a positive change means worse (higher number = lower rank).
  // We invert direction for position so "up" always = good for the client.
  invertedForPosition?: boolean;
  format: "number" | "percent" | "position";
};

export type ReportSummary = {
  headline: string;
  bullets: SummaryBullet[];
};

function changePct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function directionOf(pct: number, threshold = 0.5): SummaryDirection {
  if (Math.abs(pct) < threshold) return "flat";
  return pct > 0 ? "up" : "down";
}

function bullet(
  label: string,
  current: number,
  previous: number | null,
  format: SummaryBullet["format"],
  invertForPosition = false,
): SummaryBullet {
  const pct = previous == null ? null : changePct(current, previous);
  let direction: SummaryDirection = "flat";
  if (pct != null) {
    direction = directionOf(pct);
    // For position: lower = better. So "up" (positive change in number) actually
    // means worse. Flip for display.
    if (invertForPosition && direction !== "flat") {
      direction = direction === "up" ? "down" : "up";
    }
  }
  return {
    label,
    current,
    previous,
    direction,
    changePct: pct,
    invertedForPosition: invertForPosition,
    format,
  };
}

export function buildReportSummary(opts: {
  gsc: GscOverview;
  prevGsc: GscOverview | null;
  ga4: Ga4Overview;
  prevGa4: Ga4Overview | null;
  hasGsc: boolean;
  hasGa4: boolean;
}): ReportSummary {
  const bullets: SummaryBullet[] = [];

  if (opts.hasGsc) {
    bullets.push(
      bullet(
        "Organic clicks",
        opts.gsc.totals.clicks,
        opts.prevGsc?.totals.clicks ?? null,
        "number",
      ),
    );
    bullets.push(
      bullet(
        "Impressions",
        opts.gsc.totals.impressions,
        opts.prevGsc?.totals.impressions ?? null,
        "number",
      ),
    );
    bullets.push(
      bullet(
        "Average CTR",
        opts.gsc.totals.ctr * 100,
        opts.prevGsc ? opts.prevGsc.totals.ctr * 100 : null,
        "percent",
      ),
    );
    bullets.push(
      bullet(
        "Average position",
        opts.gsc.totals.position,
        opts.prevGsc?.totals.position ?? null,
        "position",
        /* invertForPosition */ true,
      ),
    );
  }

  if (opts.hasGa4) {
    bullets.push(
      bullet(
        "Sessions",
        opts.ga4.totals.sessions,
        opts.prevGa4?.totals.sessions ?? null,
        "number",
      ),
    );
    bullets.push(
      bullet(
        "Users",
        opts.ga4.totals.totalUsers,
        opts.prevGa4?.totals.totalUsers ?? null,
        "number",
      ),
    );
  }

  // Headline: pick the biggest mover across all bullets, weighted by importance
  // (clicks > sessions > impressions > CTR > position).
  const priority: Record<string, number> = {
    "Organic clicks": 5,
    Sessions: 4,
    Impressions: 3,
    "Average CTR": 2,
    "Average position": 2,
    Users: 1,
  };
  const ranked = [...bullets]
    .filter((b) => b.changePct != null && b.direction !== "flat")
    .sort((a, b) => {
      const pa = priority[a.label] ?? 0;
      const pb = priority[b.label] ?? 0;
      if (pb !== pa) return pb - pa;
      return Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0);
    });

  let headline: string;
  if (!opts.hasGsc && !opts.hasGa4) {
    headline =
      "Connect Google Search Console and Analytics to see your performance summary.";
  } else if (ranked.length === 0) {
    headline =
      "Performance held steady versus the previous period — no large swings to report.";
  } else {
    const top = ranked[0];
    const dirWord =
      top.direction === "up" ? "up" : top.direction === "down" ? "down" : "flat";
    const pct = top.changePct == null ? 0 : Math.abs(top.changePct);
    headline = `${top.label} ${dirWord} ${pct.toFixed(0)}% vs the previous period.`;
  }

  return { headline, bullets };
}

export function formatBulletValue(b: SummaryBullet): string {
  switch (b.format) {
    case "percent":
      return `${b.current.toFixed(2)}%`;
    case "position":
      return b.current.toFixed(1);
    case "number":
    default:
      return new Intl.NumberFormat("en-US").format(Math.round(b.current));
  }
}
