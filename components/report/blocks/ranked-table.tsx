"use client";

import { MetrikaReportData } from "@/lib/services/metrika";

interface RankedTableProps {
  data: MetrikaReportData;
  comparison: MetrikaReportData | null;
  labelHeader: string;
  truncateUrl?: boolean;
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function truncate(s: string, max = 60) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

export function RankedTable({ data, comparison, labelHeader, truncateUrl = false }: RankedTableProps) {
  const rows = data?.data ?? [];
  const cmpMap = new Map<string, number>();
  if (comparison) {
    for (const item of comparison.data ?? []) {
      cmpMap.set(item.dimensions[0]?.name ?? "", item.metrics[0] ?? 0);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-center py-2 px-3 text-gray-500 font-medium w-10">№</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">{labelHeader}</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Визиты</th>
            {comparison && <th className="text-right py-2 px-3 text-gray-500 font-medium">Δ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => {
            const name = item.dimensions[0]?.name ?? "";
            const visits = item.metrics[0] ?? 0;
            const prevVisits = cmpMap.get(name);
            const diff = prevVisits != null ? pctDiff(visits, prevVisits) : null;
            return (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="text-center py-2 px-3 text-gray-400">{i + 1}</td>
                <td className="py-2 px-3 text-gray-800 font-mono text-xs max-w-xs break-all">
                  {truncateUrl ? truncate(name) : name}
                </td>
                <td className="text-right py-2 px-3 font-medium">{visits.toLocaleString("ru-RU")}</td>
                {comparison && (
                  <td className={`text-right py-2 px-3 text-xs font-medium ${diff == null ? "text-gray-400" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
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
