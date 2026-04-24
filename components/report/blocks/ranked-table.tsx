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

export function RankedTable({ data, labelHeader, truncateUrl = false }: RankedTableProps) {
  const rows = data?.rows ?? [];
  const hasPrev = rows.some((r) => r.prevVisits !== undefined);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-center py-2 px-3 text-gray-500 font-medium w-10">№</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">{labelHeader}</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Визиты</th>
            {hasPrev && <th className="text-right py-2 px-3 text-gray-500 font-medium">Δ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const diff = row.prevVisits != null ? pctDiff(row.visits, row.prevVisits) : null;
            return (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="text-center py-2 px-3 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="py-2 px-3 text-gray-800 font-mono text-xs max-w-xs break-all">
                  {truncateUrl ? truncate(row.name) : row.name}
                </td>
                <td className="text-right py-2 px-3 font-medium tabular-nums">{row.visits.toLocaleString("ru-RU")}</td>
                {hasPrev && (
                  <td className={`text-right py-2 px-3 text-xs font-medium tabular-nums ${diff == null ? "text-gray-400" : diff > 0 ? "text-green-600" : "text-red-500"}`}>
                    {diff != null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%` : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
