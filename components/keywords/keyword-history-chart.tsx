"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function KeywordHistoryChart({
  data,
}: {
  data: { date: string; position: number }[];
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(d) => (d ?? "").slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            reversed
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(v) => Number(v).toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 11,
            }}
            formatter={(value) =>
              typeof value === "number" ? value.toFixed(1) : ""
            }
            labelFormatter={(d) => String(d ?? "")}
          />
          <Line
            type="monotone"
            dataKey="position"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
