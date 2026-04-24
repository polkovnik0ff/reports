"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { PieLabelRenderProps } from "recharts";

export interface DonutRow {
  name: string;
  visits: number;
  bounceRate?: number;
  pageDepth?: number;
  avgDuration?: number;
  prevVisits?: number;
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

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

const RADIAN = Math.PI / 180;
function renderLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.05) return null;
  const ri = typeof innerRadius === "number" ? innerRadius : 0;
  const ro = typeof outerRadius === "number" ? outerRadius : 0;
  const ma = typeof midAngle === "number" ? midAngle : 0;
  const cxn = typeof cx === "number" ? cx : 0;
  const cyn = typeof cy === "number" ? cy : 0;
  const radius = ri + (ro - ri) * 0.5;
  const x = cxn + radius * Math.cos(-ma * RADIAN);
  const y = cyn + radius * Math.sin(-ma * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
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
  const total = rows.reduce((s, r) => s + r.visits, 0);
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
                label={renderLabel}
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
                <span className="text-gray-400 font-normal ml-1">
                  ({total > 0 ? ((r.visits / total) * 100).toFixed(1) : 0}%)
                </span>
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
              {rows[0]?.prevVisits !== undefined && <th className="text-right py-2 px-3 text-gray-500 font-medium">Δ</th>}
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>}
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Глубина</th>}
              {hasExtended && <th className="text-right py-2 px-3 text-gray-500 font-medium">Время</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const diff = r.prevVisits != null ? pctDiff(r.visits, r.prevVisits) : null;
              return (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-medium tabular-nums">{r.visits.toLocaleString("ru-RU")}</td>
                  {r.prevVisits !== undefined && (
                    <td className={`text-right py-2 px-3 text-xs font-medium tabular-nums ${diff == null ? "text-gray-400" : diff > 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff != null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%` : "—"}
                    </td>
                  )}
                  {r.bounceRate != null && <td className="text-right py-2 px-3 tabular-nums">{r.bounceRate.toFixed(1)}%</td>}
                  {r.pageDepth != null && <td className="text-right py-2 px-3 tabular-nums">{r.pageDepth.toFixed(2)}</td>}
                  {r.avgDuration != null && <td className="text-right py-2 px-3 tabular-nums">{fmtTime(r.avgDuration)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
