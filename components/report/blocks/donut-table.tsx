"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export interface DonutRow {
  name: string;
  visits: number;
  bounceRate?: number;
  pageDepth?: number;
  avgDuration?: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
  color: string;
}

interface DonutTableProps {
  rows: DonutRow[];
  firstColLabel?: string;
  metricLabel?: string;
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

function DiffSup({ cur, prev }: { cur: number; prev?: number }) {
  if (prev == null) return null;
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

// Keep top 6 for donut, merge rest into "Другие"
function toDonutSlices(rows: DonutRow[]): DonutRow[] {
  if (rows.length <= 6) return rows;
  const top = rows.slice(0, 6);
  const rest = rows.slice(6);
  const otherVisits = rest.reduce((s, r) => s + r.visits, 0);
  return [
    ...top,
    { name: "Другие", visits: otherVisits, color: "#9ca3af" },
  ];
}

export function DonutTable({ rows, firstColLabel = "Источник", metricLabel = "Визиты" }: DonutTableProps) {
  const slices = toDonutSlices(rows);
  const hasExtended = rows[0]?.bounceRate != null;

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 items-start mb-6">
        <div className="w-full lg:w-64 h-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="visits"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                labelLine={false}
              >
                {slices.map((r, i) => (
                  <Cell key={i} fill={r.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString("ru-RU"), metricLabel]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 justify-center">
          {slices.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-gray-700">{r.name}</span>
              <span className="ml-auto font-medium text-gray-900 pl-4 tabular-nums">
                {r.visits.toLocaleString("ru-RU")}
                <DiffSup cur={r.visits} prev={r.prevVisits} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">{firstColLabel}</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">{metricLabel}</th>
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>}
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Глубина</th>}
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Время</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </div>
                </td>
                <td className="text-right py-2 px-3 font-medium tabular-nums">
                  {r.visits.toLocaleString("ru-RU")}
                  <DiffSup cur={r.visits} prev={r.prevVisits} />
                </td>
                {r.bounceRate != null && (
                  <td className="text-right py-2 px-3 tabular-nums">
                    {r.bounceRate.toFixed(1)}%
                    <DiffSup cur={r.bounceRate} prev={r.prevBounceRate} />
                  </td>
                )}
                {r.pageDepth != null && (
                  <td className="text-right py-2 px-3 tabular-nums">
                    {r.pageDepth.toFixed(2)}
                    <DiffSup cur={r.pageDepth} prev={r.prevPageDepth} />
                  </td>
                )}
                {r.avgDuration != null && (
                  <td className="text-right py-2 px-3 tabular-nums">
                    {fmtTime(r.avgDuration)}
                    <DiffSup cur={r.avgDuration} prev={r.prevAvgDuration} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
