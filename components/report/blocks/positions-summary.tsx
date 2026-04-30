"use client";

import { PositionsSummaryData } from "@/lib/services/topvisor";

function diff(cur: number, prev: number | null): number | null {
  if (prev === null) return null;
  return cur - prev;
}

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number | null;
  higherIsBetter?: boolean;
}

function KpiCard({ label, value, delta, higherIsBetter = true }: KpiCardProps) {
  const sign  = delta === null || delta === undefined ? null : delta > 0 ? "+" : delta < 0 ? "−" : null;
  const abs   = delta !== null && delta !== undefined ? Math.abs(delta) : 0;
  const good  = delta !== null && delta !== undefined && (higherIsBetter ? delta > 0 : delta < 0);
  const bad   = delta !== null && delta !== undefined && (higherIsBetter ? delta < 0 : delta > 0);

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-5 py-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sign !== null && (
        <span className={`text-xs font-medium ${good ? "text-green-600" : bad ? "text-red-500" : "text-muted-foreground"}`}>
          {sign}{abs}
        </span>
      )}
    </div>
  );
}

interface Props {
  data: PositionsSummaryData;
}

export function PositionsSummaryBlock({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <KpiCard
        label="Запросов"
        value={data.totalKeywords.toLocaleString("ru-RU")}
      />
      {data.visibility !== null && (
        <KpiCard
          label="Видимость"
          value={`${data.visibility.toFixed(1)} %`}
        />
      )}
      <KpiCard
        label="ТОП-1"
        value={String(data.top1)}
        delta={diff(data.top1, data.prevTop1)}
      />
      <KpiCard
        label="ТОП-3"
        value={String(data.top3)}
        delta={diff(data.top3, data.prevTop3)}
      />
      <KpiCard
        label="ТОП-5"
        value={String(data.top5)}
        delta={diff(data.top5, data.prevTop5)}
      />
      <KpiCard
        label="ТОП-10"
        value={String(data.top10)}
        delta={diff(data.top10, data.prevTop10)}
      />
    </div>
  );
}
