"use client";

import { RankedResult } from "@/lib/services/metrika";

interface RankedTableProps {
  data: RankedResult;
  labelHeader: string;
  truncateUrl?: boolean;
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function truncate(s: string, max = 70) {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function DiffSup({ cur, prev }: { cur: number; prev?: number }) {
  if (prev == null) return null;
  const diff = pctDiff(cur, prev);
  if (diff == null) return null;
  const up = diff > 0;
  return (
    <sup style={{ fontSize: "0.65em", fontWeight: 600, color: up ? "#16a34a" : "#dc2626", marginLeft: "3px" }}>
      {up ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}%
    </sup>
  );
}

export function RankedTable({ data, labelHeader, truncateUrl = false }: RankedTableProps) {
  const rows = data?.rows ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-center py-2 px-3 text-gray-500 font-medium w-10">№</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">{labelHeader}</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Посетители</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="text-center py-2 px-3 text-gray-400 tabular-nums">{i + 1}</td>
              <td className="py-2 px-3 text-gray-800 font-mono text-xs max-w-xs break-all">
                {truncateUrl ? truncate(row.name) : row.name}
              </td>
              <td className="text-right py-2 px-3 font-medium tabular-nums">
                {row.visits.toLocaleString("ru-RU")}
                <DiffSup cur={row.visits} prev={row.prevVisits} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
