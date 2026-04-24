"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetrikaReportData } from "@/lib/services/metrika";

interface AreaChartBlockProps {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
  currentLabel?: string;
  compareLabel?: string;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseDate(intervals: string[][]): string[] {
  return intervals.map((d) => {
    const dateStr = d[0];
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  });
}

export function AreaChartBlock({
  current,
  comparison,
  currentLabel = "Текущий период",
  compareLabel = "Период сравнения",
}: AreaChartBlockProps) {
  const intervals = current?.time_intervals ?? [];
  const labels = intervals.length ? parseDate(intervals) : (current?.data ?? []).map((d) => d.dimensions[0]?.name ?? "");

  const chartData = labels.map((label, i) => {
    const row = current?.data?.[i];
    const cmpRow = comparison?.data?.[i];
    return {
      label,
      current: row?.metrics[0] ?? 0,
      compare: cmpRow?.metrics[0] ?? undefined,
    };
  });

  // KPI totals
  const curTotals = current?.totals ?? current?.data?.reduce(
    (acc, d) => {
      d.metrics.forEach((m, i) => { acc[i] = (acc[i] ?? 0) + m; });
      return acc;
    },
    [] as number[]
  ) ?? [];

  const cmpTotals = comparison?.totals ?? comparison?.data?.reduce(
    (acc, d) => {
      d.metrics.forEach((m, i) => { acc[i] = (acc[i] ?? 0) + m; });
      return acc;
    },
    [] as number[]
  ) ?? [];

  const hasComparison = comparison != null && chartData.some((d) => d.compare != null);

  return (
    <div>
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorCompare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}
            />
            {hasComparison && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Area
              type="monotone"
              dataKey="current"
              name={currentLabel}
              stroke="#14b8a6"
              strokeWidth={2}
              fill="url(#colorCurrent)"
              dot={false}
            />
            {hasComparison && (
              <Area
                type="monotone"
                dataKey="compare"
                name={compareLabel}
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#colorCompare)"
                dot={false}
                strokeDasharray="5 3"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {curTotals.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Визиты", cur: curTotals[0], cmp: cmpTotals[0], fmt: (n: number) => Math.round(n).toLocaleString("ru-RU") },
            { label: "Отказы", cur: curTotals[1], cmp: cmpTotals[1], fmt: (n: number) => n.toFixed(1) + "%" },
            { label: "Глубина", cur: curTotals[2], cmp: cmpTotals[2], fmt: (n: number) => n.toFixed(2) },
            { label: "Время", cur: curTotals[3], cmp: cmpTotals[3], fmt: (n: number) => fmtTime(n) },
          ].map(({ label, cur, cmp, fmt }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-lg font-bold text-gray-900">{cur != null ? fmt(cur) : "—"}</p>
              {cmp != null && (
                <p className="text-xs text-gray-500">{compareLabel}: {fmt(cmp)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
