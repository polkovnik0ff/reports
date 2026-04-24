"use client";

import { TrafficSummaryResult } from "@/lib/services/metrika";

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " М";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " К";
  return Math.round(n).toLocaleString("ru-RU");
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

interface KpiCardProps {
  label: string;
  value: string;
  diff?: number | null;
  invertDiff?: boolean; // for bounce rate: lower is better
}

function KpiCard({ label, value, diff, invertDiff = false }: KpiCardProps) {
  const isGood = diff != null && (invertDiff ? diff < 0 : diff > 0);
  const isBad  = diff != null && (invertDiff ? diff > 0 : diff < 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex-1 min-w-[140px]">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{value}</p>
      {diff != null && (
        <div className={`flex items-center gap-1 text-sm font-medium ${isGood ? "text-green-600" : isBad ? "text-red-500" : "text-gray-400"}`}>
          <span>{isGood ? "↑" : isBad ? "↓" : "—"}</span>
          <span>{Math.abs(diff).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export function TrafficSummaryBlock({ data }: { data: TrafficSummaryResult }) {
  const c = data?.current;
  const p = data?.previous;

  if (!c) return <p className="text-gray-400 italic text-sm">Нет данных</p>;

  return (
    <div className="flex gap-4 flex-wrap">
      <KpiCard
        label="Посетители"
        value={fmtNum(c.users)}
        diff={p ? pctDiff(c.users, p.users) : null}
      />
      <KpiCard
        label="Визиты"
        value={fmtNum(c.visits)}
        diff={p ? pctDiff(c.visits, p.visits) : null}
      />
      <KpiCard
        label="Просмотры"
        value={fmtNum(c.pageviews)}
        diff={p ? pctDiff(c.pageviews, p.pageviews) : null}
      />
      <KpiCard
        label="Глубина просмотра"
        value={c.pageDepth.toFixed(2)}
        diff={p ? pctDiff(c.pageDepth, p.pageDepth) : null}
      />
      <KpiCard
        label="Длительность визита"
        value={fmtDuration(c.avgDuration)}
        diff={p ? pctDiff(c.avgDuration, p.avgDuration) : null}
      />
      <KpiCard
        label="Показатель отказов"
        value={c.bounceRate.toFixed(1) + "%"}
        diff={p ? pctDiff(c.bounceRate, p.bounceRate) : null}
        invertDiff
      />
    </div>
  );
}
