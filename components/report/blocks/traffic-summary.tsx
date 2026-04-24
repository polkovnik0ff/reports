"use client";

import { MetrikaReportData } from "@/lib/services/metrika";

interface TrafficSummaryData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "М";
  if (n >= 1000) return (n / 1000).toFixed(1) + "К";
  return Math.round(n).toLocaleString("ru-RU");
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(current: number, prev: number) {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

interface KpiCardProps {
  label: string;
  value: string;
  diff?: number | null;
}

function KpiCard({ label, value, diff }: KpiCardProps) {
  const isPos = diff != null && diff > 0;
  const isNeg = diff != null && diff < 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex-1 min-w-0">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      {diff != null && (
        <div className={`flex items-center gap-1 text-sm font-medium ${isPos ? "text-green-600" : isNeg ? "text-red-500" : "text-gray-400"}`}>
          <span>{isPos ? "↑" : isNeg ? "↓" : "—"}</span>
          <span>{Math.abs(diff).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export function TrafficSummaryBlock({ data }: { data: TrafficSummaryData }) {
  const cur = data.current?.totals ?? [];
  const cmp = data.comparison?.totals ?? [];

  const visits = cur[0] ?? 0;
  const users = cur[1] ?? 0;
  const bounce = cur[2] ?? 0;
  const depth = cur[3] ?? 0;
  const duration = cur[4] ?? 0;

  const prevVisits = cmp[0];
  const prevUsers = cmp[1];
  const prevBounce = cmp[2];
  const prevDuration = cmp[4];

  return (
    <div className="flex gap-4 flex-wrap">
      <KpiCard label="Визиты" value={fmtNum(visits)} diff={prevVisits != null ? pctDiff(visits, prevVisits) : null} />
      <KpiCard label="Уникальные посетители" value={fmtNum(users)} diff={prevUsers != null ? pctDiff(users, prevUsers) : null} />
      <KpiCard label="Отказы" value={bounce.toFixed(1) + "%"} diff={prevBounce != null ? pctDiff(bounce, prevBounce) : null} />
      <KpiCard label="Время на сайте" value={fmtTime(duration)} diff={prevDuration != null ? pctDiff(duration, prevDuration) : null} />
    </div>
  );
}
