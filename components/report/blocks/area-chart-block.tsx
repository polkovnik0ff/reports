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
import { DynamicsResult } from "@/lib/services/metrika";

interface AreaChartBlockProps {
  data: DynamicsResult;
  currentLabel?: string;
  compareLabel?: string;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, cmp: number): number | null {
  if (cmp === 0) return null;
  return ((cur - cmp) / Math.abs(cmp)) * 100;
}

function KpiCard({
  label, cur, cmp, fmt, invertSign = false,
}: {
  label: string;
  cur: number;
  cmp: number | null;
  fmt: (v: number) => string;
  invertSign?: boolean;
}) {
  const diff = cmp != null ? pctDiff(cur, cmp) : null;
  const isGood = diff == null ? null : invertSign ? diff < 0 : diff > 0;
  const color = isGood == null ? "text-gray-900" : isGood ? "text-green-600" : "text-red-500";
  const arrow = isGood == null ? null : isGood ? "↑" : "↓";

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${diff != null ? color : "text-gray-900"}`}>
        {fmt(cur)}
        {diff != null && arrow && (
          <sup style={{ fontSize: "0.65em", fontWeight: 600, marginLeft: "3px" }}>
            {arrow}{Math.abs(diff).toFixed(1)}%
          </sup>
        )}
      </p>
      {cmp != null && (
        <p className="text-xs text-gray-400">{fmt(cmp)}</p>
      )}
    </div>
  );
}

export function AreaChartBlock({
  data,
  currentLabel = "Текущий период",
  compareLabel = "Период сравнения",
}: AreaChartBlockProps) {
  const { current, comparison } = data ?? {};

  // Build labels from dimensions[0].name (date string from Metrika)
  const labels = (current?.data ?? []).map((d) => {
    const raw = d.dimensions[0]?.name ?? "";
    // Metrika returns dates as "2026-03-01" — format to DD.MM
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    }
    return raw;
  });

  const chartData = labels.map((label, i) => {
    const row = current?.data?.[i];
    const cmpRow = comparison?.data?.[i];
    return {
      label,
      current: row?.metrics[0] ?? 0,
      compare: cmpRow?.metrics[0] ?? undefined,
    };
  });

  const hasComparison = comparison != null && chartData.some((d) => d.compare != null);

  // Aggregate totals for KPI row (sum visits; avg for rates)
  const sumMetric = (idx: number, src: typeof current): number => {
    if (!src?.data?.length) return 0;
    return src.data.reduce((acc, d) => acc + (d.metrics[idx] ?? 0), 0);
  };
  const avgMetric = (idx: number, src: typeof current): number => {
    if (!src?.data?.length) return 0;
    return sumMetric(idx, src) / src.data.length;
  };

  const curVisits = sumMetric(0, current);
  const cmpVisits = comparison ? sumMetric(0, comparison) : null;

  // search_dynamics only has visits (1 metric); yoy has 4 metrics
  const hasExtra = (current?.data?.[0]?.metrics.length ?? 0) > 1;
  const curBounce  = hasExtra ? avgMetric(1, current) : null;
  const curDepth   = hasExtra ? avgMetric(2, current) : null;
  const curTime    = hasExtra ? avgMetric(3, current) : null;
  const cmpBounce  = hasExtra && comparison ? avgMetric(1, comparison) : null;
  const cmpDepth   = hasExtra && comparison ? avgMetric(2, comparison) : null;
  const cmpTime    = hasExtra && comparison ? avgMetric(3, comparison) : null;

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
            <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }} />
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

      <div className={`grid gap-4 ${hasExtra ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
        <KpiCard
          label="Посетители"
          cur={Math.round(curVisits)}
          cmp={cmpVisits != null ? Math.round(cmpVisits) : null}
          fmt={(v) => v.toLocaleString("ru-RU")}
        />
        {curBounce != null && (
          <KpiCard
            label="Отказы"
            cur={curBounce}
            cmp={cmpBounce ?? null}
            fmt={(v) => `${v.toFixed(1)}%`}
            invertSign
          />
        )}
        {curDepth != null && (
          <KpiCard
            label="Глубина просмотра"
            cur={curDepth}
            cmp={cmpDepth ?? null}
            fmt={(v) => v.toFixed(2)}
          />
        )}
        {curTime != null && (
          <KpiCard
            label="Время на сайте"
            cur={curTime}
            cmp={cmpTime ?? null}
            fmt={fmtTime}
          />
        )}
      </div>
    </div>
  );
}
