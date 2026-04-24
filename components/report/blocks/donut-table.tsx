"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { PieLabelRenderProps } from "recharts";

export interface DonutRow {
  name: string;
  visits: number;
  bounce?: number;
  depth?: number;
  duration?: number;
  color: string;
}

interface DonutTableProps {
  rows: DonutRow[];
  showExtendedTable?: boolean;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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

export function DonutTable({ rows, showExtendedTable = true }: DonutTableProps) {
  const total = rows.reduce((s, r) => s + r.visits, 0);

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 items-start mb-6">
        <div className="w-full lg:w-64 h-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="visits"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                labelLine={false}
                label={renderLabel}
              >
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString("ru-RU"), "Визиты"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 justify-center">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-gray-700">{r.name}</span>
              <span className="ml-auto font-medium text-gray-900 pl-4">
                {total > 0 ? ((r.visits / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
      {showExtendedTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Источник</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Визиты</th>
                {rows[0]?.bounce != null && <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>}
                {rows[0]?.depth != null && <th className="text-right py-2 px-3 text-gray-500 font-medium">Глубина</th>}
                {rows[0]?.duration != null && <th className="text-right py-2 px-3 text-gray-500 font-medium">Время</th>}
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
                  <td className="text-right py-2 px-3 font-medium">{r.visits.toLocaleString("ru-RU")}</td>
                  {r.bounce != null && <td className="text-right py-2 px-3">{r.bounce.toFixed(1)}%</td>}
                  {r.depth != null && <td className="text-right py-2 px-3">{r.depth.toFixed(2)}</td>}
                  {r.duration != null && <td className="text-right py-2 px-3">{fmtTime(r.duration)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
