"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn, formatNumber } from "@/lib/utils";
import type { BacklinkMonthBucket } from "@/lib/backlinks";

type Props = {
  months: BacklinkMonthBucket[]; // oldest → newest
};

export function BacklinksMonthlyTrend({ months }: Props) {
  if (months.length === 0) return null;

  const current = months[months.length - 1]?.count ?? 0;
  const prev = months[months.length - 2]?.count ?? 0;

  let delta: { pct: number; label: string; good: boolean | null } | null = null;
  if (months.length >= 2) {
    if (prev === 0 && current === 0) {
      delta = { pct: 0, label: "no change", good: null };
    } else if (prev === 0) {
      delta = { pct: Infinity, label: "+new", good: true };
    } else {
      const pct = (current - prev) / prev;
      delta = {
        pct,
        label: `${pct >= 0 ? "+" : ""}${(pct * 100).toFixed(0)}%`,
        good: pct >= 0,
      };
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            This month
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">
            {formatNumber(current)}
          </p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Last month
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-muted-foreground">
            {formatNumber(prev)}
          </p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Change
          </p>
          {delta ? (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center text-xl font-bold tabular-nums",
                delta.good === null
                  ? "text-muted-foreground"
                  : delta.good
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
              )}
            >
              {delta.good === null ? (
                <Minus className="mr-1 h-4 w-4" />
              ) : delta.good ? (
                <ArrowUp className="mr-0.5 h-4 w-4" />
              ) : (
                <ArrowDown className="mr-0.5 h-4 w-4" />
              )}
              {delta.label}
            </p>
          ) : (
            <p className="mt-0.5 text-xl font-bold text-muted-foreground">—</p>
          )}
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              axisLine={false}
              tickLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) =>
                typeof value === "number" ? formatNumber(value) : ""
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {months.map((m, i) => (
                <Cell
                  key={m.month}
                  fill={
                    i === months.length - 1
                      ? "hsl(338 86% 54%)"
                      : "hsl(338 86% 54% / 0.4)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
