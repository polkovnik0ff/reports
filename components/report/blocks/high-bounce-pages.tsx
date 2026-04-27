"use client";

function truncate(s: string, max = 70) {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DiffSup({ cur, prev, invertSign = false }: { cur: number; prev?: number; invertSign?: boolean }) {
  if (prev == null) return null;
  const diff = pctDiff(cur, prev);
  if (diff == null) return null;
  const up = diff > 0;
  const good = invertSign ? !up : up;
  return (
    <sup style={{ fontSize: "0.65em", fontWeight: 600, color: good ? "#16a34a" : "#dc2626", marginLeft: "3px" }}>
      {up ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}%
    </sup>
  );
}

interface HighBounceRow {
  name: string;
  visits: number;
  bounceRate: number;
  prevVisits?: number;
  prevBounceRate?: number;
}

interface HighBouncePagesData {
  rows: HighBounceRow[];
}

export function HighBouncePagesBlock({ data }: { data: HighBouncePagesData }) {
  const rows = data?.rows ?? [];
  const hasCompare = rows.some((r) => r.prevVisits != null);

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
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="text-center py-2 px-3 text-gray-400 tabular-nums">{i + 1}</td>
              <td className="py-2 px-3 text-gray-800 font-mono text-xs max-w-xs break-all">
                {truncate(row.name)}
              </td>
              <td className="text-right py-2 px-3 font-medium tabular-nums">
                {row.visits.toLocaleString("ru-RU")}
                {hasCompare && <DiffSup cur={row.visits} prev={row.prevVisits} />}
              </td>
              <td className="text-right py-2 px-3 font-medium tabular-nums" style={{ color: row.bounceRate >= 50 ? "#dc2626" : "#374151" }}>
                {row.bounceRate.toFixed(1)}%
                {hasCompare && <DiffSup cur={row.bounceRate} prev={row.prevBounceRate} invertSign />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
