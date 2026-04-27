"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SearchEnginesDynamicsResult, TrafficChannelsResult } from "@/lib/services/metrika";
import { getEngineColor } from "@/lib/utils/engine-colors";

interface TableRow {
  id?: string;
  name: string;
  visits: number;
  bounceRate?: number;
  pageDepth?: number;
  avgDuration?: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DiffSup({ cur, prev, hasCompare }: { cur: number; prev?: number; hasCompare?: boolean }) {
  if (prev == null) {
    if (!hasCompare) return null;
    return (
      <sup style={{ fontSize: "0.65em", fontWeight: 600, color: "#16a34a", marginLeft: "3px" }}>
        ↑100%
      </sup>
    );
  }
  const diff = pctDiff(cur, prev);
  if (diff == null) return null;
  const up = diff > 0;
  const color = up ? "#16a34a" : "#dc2626";
  const arrow = up ? "↑" : "↓";
  return (
    <sup style={{ fontSize: "0.65em", fontWeight: 600, color, marginLeft: "3px" }}>
      {arrow}{Math.abs(diff).toFixed(1)}%
    </sup>
  );
}

interface Props {
  data: SearchEnginesDynamicsResult;
  tableData?: TrafficChannelsResult | null;
}

export function TrafficSearchDynamicsBlock({ data, tableData }: Props) {
  if (!data || data.dates.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-400 italic">
        Данные недоступны
      </div>
    );
  }

  const chartData = data.dates.map((date, i) => {
    const parsed = new Date(date);
    const label = !isNaN(parsed.getTime())
      ? parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
      : date;
    const point: Record<string, string | number> = { label };
    for (const s of data.series) {
      point[s.name] = s.data[i] ?? 0;
    }
    return point;
  });

  // Build summary table rows: top 6 + "Другие"
  const rawRows = tableData?.rows ?? [];
  const TOP = 6;
  const topRows = rawRows.slice(0, TOP);
  const otherRows = rawRows.slice(TOP);

  const hasCompare = rawRows.some((r) => r.prevVisits != null);

  let tableRows: TableRow[] = topRows;
  if (otherRows.length > 0) {
    const otherVisits = otherRows.reduce((s, r) => s + r.visits, 0);
    const otherPrevVisits = hasCompare
      ? otherRows.reduce((s, r) => s + (r.prevVisits ?? 0), 0)
      : undefined;

    const otherBounce = otherRows.every((r) => r.bounceRate != null)
      ? otherRows.reduce((s, r) => s + r.bounceRate! * r.visits, 0) /
        Math.max(otherVisits, 1)
      : undefined;
    const otherPrevBounce =
      hasCompare && otherRows.every((r) => r.prevBounceRate != null)
        ? otherRows.reduce((s, r) => s + r.prevBounceRate! * (r.prevVisits ?? 0), 0) /
          Math.max(otherPrevVisits ?? 1, 1)
        : undefined;

    const otherDepth = otherRows.every((r) => r.pageDepth != null)
      ? otherRows.reduce((s, r) => s + r.pageDepth! * r.visits, 0) /
        Math.max(otherVisits, 1)
      : undefined;
    const otherPrevDepth =
      hasCompare && otherRows.every((r) => r.prevPageDepth != null)
        ? otherRows.reduce((s, r) => s + r.prevPageDepth! * (r.prevVisits ?? 0), 0) /
          Math.max(otherPrevVisits ?? 1, 1)
        : undefined;

    const otherDuration = otherRows.every((r) => r.avgDuration != null)
      ? otherRows.reduce((s, r) => s + r.avgDuration! * r.visits, 0) /
        Math.max(otherVisits, 1)
      : undefined;
    const otherPrevDuration =
      hasCompare && otherRows.every((r) => r.prevAvgDuration != null)
        ? otherRows.reduce((s, r) => s + r.prevAvgDuration! * (r.prevVisits ?? 0), 0) /
          Math.max(otherPrevVisits ?? 1, 1)
        : undefined;

    tableRows = [
      ...topRows,
      {
        id: "other",
        name: "Другие",
        visits: otherVisits,
        bounceRate: otherBounce,
        pageDepth: otherDepth,
        avgDuration: otherDuration,
        prevVisits: otherPrevVisits,
        prevBounceRate: otherPrevBounce,
        prevPageDepth: otherPrevDepth,
        prevAvgDuration: otherPrevDuration,
      },
    ];
  }

  const hasExtended = tableRows.some((r) => r.bounceRate != null);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        {data.series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getEngineColor(s.name, i) }} />
            {s.name}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }} />
            {data.series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={getEngineColor(s.name, i)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      {tableRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Поисковая система</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Посетители</th>
                {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>}
                {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Глубина</th>}
                {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Время</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            r.name === "Другие" ? "#9ca3af" : getEngineColor(r.id ?? r.name, i),
                        }}
                      />
                      {r.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-medium tabular-nums">
                    {r.visits.toLocaleString("ru-RU")}
                    <DiffSup cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                  </td>
                  {hasExtended && (
                    <td className="text-right py-2 px-3 tabular-nums">
                      {r.bounceRate != null ? (
                        <>
                          {r.bounceRate.toFixed(1)}%
                          <DiffSup cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} />
                        </>
                      ) : "—"}
                    </td>
                  )}
                  {hasExtended && (
                    <td className="text-right py-2 px-3 tabular-nums">
                      {r.pageDepth != null ? (
                        <>
                          {r.pageDepth.toFixed(2)}
                          <DiffSup cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} />
                        </>
                      ) : "—"}
                    </td>
                  )}
                  {hasExtended && (
                    <td className="text-right py-2 px-3 tabular-nums">
                      {r.avgDuration != null ? (
                        <>
                          {fmtTime(r.avgDuration)}
                          <DiffSup cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} />
                        </>
                      ) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
