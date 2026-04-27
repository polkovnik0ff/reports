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
import { DynamicsResult, YoYKpi } from "@/lib/services/metrika";

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
  cmp?: number;
  fmt: (v: number) => string;
  invertSign?: boolean;
}) {
  const diff = cmp != null ? pctDiff(cur, cmp) : null;
  const isGood = diff == null ? null : invertSign ? diff < 0 : diff > 0;
  const color = isGood == null ? "text-gray-900" : isGood ? "text-green-600" : "text-red-500";
  const arrow = diff == null ? null : diff > 0 ? "↑" : "↓";

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
  const { current, comparison, currentKpi, comparisonKpi } = data ?? {};

  const labels = (current?.data ?? []).map((d) => {
    const raw = d.dimensions[0]?.name ?? "";
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    }
    return raw;
  });

  const chartData = labels.map((label, i) => {
    const row    = current?.data?.[i];
    const cmpRow = comparison?.data?.[i];
    return {
      label,
      current: row?.metrics[0] ?? 0,
      compare: cmpRow?.metrics[0] ?? undefined,
    };
  });

  const hasComparison = comparison != null && chartData.some((d) => d.compare != null);
  const hasKpi = currentKpi != null;

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

      {hasKpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Посетители"
            cur={currentKpi!.users}
            cmp={comparisonKpi?.users}
            fmt={(v) => v.toLocaleString("ru-RU")}
          />
          <KpiCard
            label="Визиты"
            cur={currentKpi!.visits}
            cmp={comparisonKpi?.visits}
            fmt={(v) => v.toLocaleString("ru-RU")}
          />
          <KpiCard
            label="Отказы"
            cur={currentKpi!.bounceRate}
            cmp={comparisonKpi?.bounceRate}
            fmt={(v) => `${v.toFixed(1)}%`}
            invertSign
          />
          <KpiCard
            label="Время на сайте"
            cur={currentKpi!.avgDuration}
            cmp={comparisonKpi?.avgDuration}
            fmt={fmtTime}
          />
        </div>
      )}
    </div>
  );
}
