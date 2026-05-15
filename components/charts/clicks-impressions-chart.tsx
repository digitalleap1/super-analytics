"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { formatNumber } from "@/lib/utils";

type Point = {
  date: string;
  clicks: number;
  impressions: number;
};

export function ClicksImpressionsChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
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
            yAxisId="clicks"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => formatNumber(Number(v))}
          />
          <YAxis
            yAxisId="impressions"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => formatNumber(Number(v))}
          />
          <Tooltip
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="clicks"
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="impressions"
            type="monotone"
            dataKey="impressions"
            name="Impressions"
            stroke="hsl(217 91% 70%)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
