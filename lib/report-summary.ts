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
  narrative: string; // multi-sentence paragraph readable as standalone text
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

  const narrative = buildNarrative(bullets, opts.hasGsc, opts.hasGa4);

  return { headline, narrative, bullets };
}

// Joins individual movements into a single human-readable paragraph. The phrasing
// is intentionally template-driven so every project's summary reads the same way
// — only the numbers and directions vary.
function buildNarrative(
  bullets: SummaryBullet[],
  hasGsc: boolean,
  hasGa4: boolean,
): string {
  if (!hasGsc && !hasGa4) {
    return "Connect Google Search Console and Analytics from project settings to load live numbers for this report.";
  }

  function phrase(label: string, b: SummaryBullet | undefined): string | null {
    if (!b) return null;
    if (b.changePct == null) {
      // No previous-period comparison available; just state the current value.
      if (b.format === "number")
        return `${label} stood at ${formatBulletValue(b)}`;
      if (b.format === "percent")
        return `${label} held at ${formatBulletValue(b)}`;
      if (b.format === "position")
        return `${label} averaged ${formatBulletValue(b)}`;
    }
    const pct = Math.abs(b.changePct ?? 0);
    if (b.direction === "flat") {
      return `${label} held roughly flat`;
    }
    const verb =
      b.direction === "up"
        ? b.format === "position"
          ? "improved"
          : "improved by"
        : b.format === "position"
          ? "slipped"
          : "dropped by";
    if (b.format === "position") {
      const delta =
        b.previous == null ? 0 : Math.abs(b.current - b.previous);
      return `${label} ${verb} ${delta.toFixed(1)} places`;
    }
    return `${label} ${verb} ${pct.toFixed(0)}%`;
  }

  const byLabel = new Map(bullets.map((b) => [b.label, b]));
  const sentences: string[] = [];

  const opener = "During the selected period";

  if (hasGsc) {
    const parts = [
      phrase("organic clicks", byLabel.get("Organic clicks")),
      phrase("impressions", byLabel.get("Impressions")),
    ].filter(Boolean) as string[];
    if (parts.length) {
      sentences.push(`${opener}, ${parts.join(", while ")}.`);
    }
    const pos = byLabel.get("Average position");
    const ctr = byLabel.get("Average CTR");
    const second: string[] = [];
    if (pos) {
      const p = phrase("average position", pos);
      if (p) second.push(p);
    }
    if (ctr) {
      const c = phrase("click-through rate", ctr);
      if (c) second.push(c);
    }
    if (second.length) {
      sentences.push(
        `${second.join(", and ").replace(/^./, (s) => s.toUpperCase())}.`,
      );
    }
  }

  if (hasGa4) {
    const sessions = byLabel.get("Sessions");
    const users = byLabel.get("Users");
    const ga4parts = [
      phrase("sessions", sessions),
      phrase("users", users),
    ].filter(Boolean) as string[];
    if (ga4parts.length) {
      const prefix = hasGsc
        ? "User activity"
        : `${opener}, user activity`;
      // We have phrases like "sessions improved by 12%". Rephrase for flow.
      const joined = ga4parts.join(", and ");
      sentences.push(
        `${prefix}: ${joined}, compared with the previous period.`,
      );
    }
  }

  if (sentences.length === 0) {
    return "Performance held steady versus the previous period — no significant changes to report.";
  }

  return sentences.join(" ");
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
