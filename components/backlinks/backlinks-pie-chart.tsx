"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { BACKLINK_CATEGORIES, type BacklinkCategory } from "@/lib/backlinks";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  rows: { category: string }[];
};

export function BacklinksPieChart({ rows }: Props) {
  const data = useMemo(() => {
    const counts = new Map<BacklinkCategory, number>();
    for (const r of rows) {
      const k = r.category as BacklinkCategory;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return BACKLINK_CATEGORIES.map((c) => ({
      name: c.label,
      value: counts.get(c.value) ?? 0,
      color: c.color,
    })).filter((d) => d.value > 0);
  }, [rows]);

  const total = rows.length;

  if (total === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-md border border-dashed bg-card/40 text-center">
        <p className="text-xl font-bold">0</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No backlinks in this date range
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[160px_1fr]">
      <div className="relative h-32 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={60}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) =>
                typeof value === "number"
                  ? [`${formatNumber(value)} (${((value / total) * 100).toFixed(0)}%)`, name]
                  : [String(value ?? ""), name]
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-bold leading-none">{formatNumber(total)}</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            backlinks
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-sm")}
              style={{ backgroundColor: d.color }}
            />
            <span className="min-w-0 flex-1 truncate text-xs">{d.name}</span>
            <span className="text-xs font-medium tabular-nums">{d.value}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
