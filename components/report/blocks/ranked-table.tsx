"use client";

import { RankedResult } from "@/lib/services/metrika";

interface RankedTableProps {
  data: RankedResult;
  labelHeader: string;
  truncateUrl?: boolean;
  linkType?: "full-url" | "domain";
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function truncate(s: string, max = 70) {
  return s.length <= max ? s : s.slice(0, max) + "…";
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
  return (
    <sup style={{ fontSize: "0.65em", fontWeight: 600, color: up ? "#16a34a" : "#dc2626", marginLeft: "3px" }}>
      {up ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}%
    </sup>
  );
}

function toHref(name: string, linkType: "full-url" | "domain"): string {
  if (linkType === "full-url") return name;
  return name.startsWith("http") ? name : `https://${name}`;
}

export function RankedTable({ data, labelHeader, truncateUrl = false, linkType }: RankedTableProps) {
  const rows = data?.rows ?? [];
  const hasCompare = rows.some((r) => r.prevVisits != null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-center py-2 px-3 text-gray-500 font-medium w-10">№</th>
            <th className="text-left py-2 px-3 text-gray-500 font-medium">{labelHeader}</th>
            <th className="text-right py-2 px-3 text-gray-500 font-medium">Визиты</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="text-center py-2 px-3 text-gray-400 tabular-nums">{i + 1}</td>
              <td className="py-2 px-3 font-mono text-xs max-w-xs break-all">
                {linkType ? (
                  <a
                    href={toHref(row.name, linkType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {truncateUrl ? truncate(row.name) : row.name}
                  </a>
                ) : (
                  <span className="text-gray-800">{truncateUrl ? truncate(row.name) : row.name}</span>
                )}
              </td>
              <td className="text-right py-2 px-3 font-medium tabular-nums">
                {row.visits.toLocaleString("ru-RU")}
                <DiffSup cur={row.visits} prev={row.prevVisits} hasCompare={hasCompare} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
