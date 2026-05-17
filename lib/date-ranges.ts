// Date range presets + previous-period math. All dates are UTC-normalised.

export type RangePreset =
  | "last7"
  | "last28"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export type DateRange = { from: Date; to: Date };

export const PRESET_LABELS: Record<RangePreset, string> = {
  last7: "Last 7 days",
  last28: "Last 28 days",
  last90: "Last 90 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  custom: "Custom",
};

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function presetRange(preset: RangePreset, now: Date = new Date()): DateRange {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  switch (preset) {
    case "last7": {
      const from = new Date(yesterday);
      from.setDate(yesterday.getDate() - 6);
      return { from, to: yesterday };
    }
    case "last28": {
      const from = new Date(yesterday);
      from.setDate(yesterday.getDate() - 27);
      return { from, to: yesterday };
    }
    case "last90": {
      const from = new Date(yesterday);
      from.setDate(yesterday.getDate() - 89);
      return { from, to: yesterday };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: yesterday };
    }
    case "lastMonth": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from, to };
    }
    case "custom":
    default: {
      // Fallback = last 28
      const from = new Date(yesterday);
      from.setDate(yesterday.getDate() - 27);
      return { from, to: yesterday };
    }
  }
}

export function previousPeriod(range: DateRange): DateRange {
  const ms = range.to.getTime() - range.from.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  const to = new Date(range.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));
  return { from, to };
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseRangeFromSearchParams(sp: {
  from?: string | string[];
  to?: string | string[];
  preset?: string | string[];
  compare?: string | string[];
}): { range: DateRange; preset: RangePreset; compare: boolean } {
  const get = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const fromStr = get(sp.from);
  const toStr = get(sp.to);
  const presetStr = get(sp.preset) as RangePreset | undefined;
  const compareStr = get(sp.compare);
  // Default to true unless explicitly disabled via ?compare=0|false|off
  const compare = !(compareStr === "0" || compareStr === "false" || compareStr === "off");

  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return {
        range: { from: startOfDay(from), to: startOfDay(to) },
        preset: presetStr ?? "custom",
        compare,
      };
    }
  }
  const preset =
    presetStr && presetStr in PRESET_LABELS ? presetStr : "last28";
  return {
    range: presetRange(preset),
    preset,
    compare,
  };
}

export function formatRangeLabel(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const fromStr = range.from.toLocaleDateString("en-US", opts);
  const toStr = range.to.toLocaleDateString("en-US", {
    ...opts,
    year: sameYear ? undefined : "numeric",
  });
  return `${fromStr} – ${toStr}`;
}
