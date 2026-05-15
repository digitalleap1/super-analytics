"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  position: number;
};

export function PositionTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(d) => d?.slice(5) ?? ""}
          />
          <YAxis
            reversed
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(v) => Number(v).toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) =>
              typeof value === "number" ? value.toFixed(1) : ""
            }
            labelFormatter={(d) => String(d ?? "")}
          />
          <Line
            type="monotone"
            dataKey="position"
            name="Avg position"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
