import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  n: number | null | undefined,
  decimals = 0,
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(
  n: number | null | undefined,
  decimals = 1,
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatPosition(n: number | null | undefined): string {
  // A valid Search Console position is >= 1.0. A 0 only ever comes from a
  // "no data" fallback (an empty period), so render it as "—" instead of
  // "0.0", which would read as a rank better than #1.
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(1);
}

export function formatDelta(
  current: number,
  previous: number,
): { value: number; label: string; isPositive: boolean } {
  if (previous === 0) {
    const isPositive = current > 0;
    return {
      value: current === 0 ? 0 : Infinity,
      label: current === 0 ? "0%" : "+∞",
      isPositive,
    };
  }
  const delta = (current - previous) / Math.abs(previous);
  const isPositive = delta >= 0;
  const sign = isPositive ? "+" : "";
  return {
    value: delta,
    label: `${sign}${(delta * 100).toFixed(1)}%`,
    isPositive,
  };
}
