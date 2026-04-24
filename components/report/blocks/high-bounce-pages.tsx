"use client";

import { MetrikaReportData } from "@/lib/services/metrika";

function truncate(s: string, max = 60) {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

export function HighBouncePagesBlock({ data }: { data: MetrikaReportData }) {
  const rows = data?.data ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-center py-2 px-3 text-gray-500 font-medium w-10">№</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">URL</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Визиты</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Отказы</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="text-center py-2 px-3 text-gray-400">{i + 1}</td>
              <td className="py-2 px-3 text-gray-800 font-mono text-xs max-w-xs break-all">
                {truncate(item.dimensions[0]?.name ?? "")}
              </td>
              <td className="text-right py-2 px-3 font-medium">{(item.metrics[0] ?? 0).toLocaleString("ru-RU")}</td>
              <td className="text-right py-2 px-3 text-red-500 font-medium">{(item.metrics[1] ?? 0).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
