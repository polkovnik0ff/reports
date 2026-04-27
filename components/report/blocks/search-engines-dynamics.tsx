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
import { DonutRow } from "./donut-table";
import { getEngineColor } from "@/lib/utils/engine-colors";

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
  dynamicsData: SearchEnginesDynamicsResult | null;
  tableData: TrafficChannelsResult | null;
}

export function SearchEnginesDynamicsBlock({ dynamicsData, tableData }: Props) {
  const hasDynamics = dynamicsData && dynamicsData.dates.length > 0 && dynamicsData.series.length > 0;
  const hasTable = tableData && (tableData.rows?.length ?? 0) > 0;

  if (!hasDynamics && !hasTable) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-400 italic">
        Данные недоступны
      </div>
    );
  }

  // Build chart data: array of { date, [engineName]: value }
  const chartData = hasDynamics
    ? dynamicsData.dates.map((date, i) => {
        const raw = new Date(date);
        const label = !isNaN(raw.getTime())
          ? raw.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
          : date;
        const point: Record<string, string | number> = { label };
        for (const s of dynamicsData.series) {
          point[s.name] = s.data[i] ?? 0;
        }
        return point;
      })
    : [];

  const tableRows: DonutRow[] = hasTable
    ? (tableData.rows ?? []).map((item, i) => ({
        name:            item.name,
        visits:          item.visits,
        bounceRate:      item.bounceRate,
        pageDepth:       item.pageDepth,
        avgDuration:     item.avgDuration,
        prevVisits:      item.prevVisits,
        prevBounceRate:  item.prevBounceRate,
        prevPageDepth:   item.prevPageDepth,
        prevAvgDuration: item.prevAvgDuration,
        color:           getEngineColor(item.id, i),
      }))
    : [];

  const hasCompare = tableRows.some((r) => r.prevVisits != null);

  return (
    <div>
      {hasDynamics && (
        <div className="mb-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3">
            {dynamicsData.series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
          <div className="h-64">
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
                {dynamicsData.series.map((s) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium w-8">№</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Поисковая система</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Посетители</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Глубина</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Время</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-medium tabular-nums">
                    {r.visits.toLocaleString("ru-RU")}
                    <DiffSup cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                  </td>
                  <td className="text-right py-2 px-3 tabular-nums">
                    {r.bounceRate != null ? (
                      <>{r.bounceRate.toFixed(1)}%<DiffSup cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 tabular-nums">
                    {r.pageDepth != null ? (
                      <>{r.pageDepth.toFixed(2)}<DiffSup cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 tabular-nums">
                    {r.avgDuration != null ? (
                      <>{fmtTime(r.avgDuration)}<DiffSup cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
