"use client";

import { PositionsSummaryData, SearcherSummary } from "@/lib/services/topvisor";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

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
  const sign = delta === null || delta === undefined ? null : delta > 0 ? "+" : delta < 0 ? "−" : null;
  const abs  = delta !== null && delta !== undefined ? Math.abs(delta) : 0;
  const good = delta !== null && delta !== undefined && (higherIsBetter ? delta > 0 : delta < 0);
  const bad  = delta !== null && delta !== undefined && (higherIsBetter ? delta < 0 : delta > 0);

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

function SearcherSection({ s }: { s: SearcherSummary }) {
  const hasCompare = s.prevTop1 !== null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">
        {s.name}
        {s.regionName && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({s.regionName})</span>}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{s.totalKeywords} запросов</span>
      </h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="ТОП-1"  value={String(s.top1)}  delta={hasCompare ? diff(s.top1,  s.prevTop1)  : null} />
        <KpiCard label="ТОП-3"  value={String(s.top3)}  delta={hasCompare ? diff(s.top3,  s.prevTop3)  : null} />
        <KpiCard label="ТОП-5"  value={String(s.top5)}  delta={hasCompare ? diff(s.top5,  s.prevTop5)  : null} />
        <KpiCard label="ТОП-10" value={String(s.top10)} delta={hasCompare ? diff(s.top10, s.prevTop10) : null} />
      </div>
    </div>
  );
}

interface Props {
  data: PositionsSummaryData;
}

export function PositionsSummaryBlock({ data }: Props) {
  const hasCompare = data.prevTop1 !== null;
  const hasSearchers = data.bySearcher && data.bySearcher.length > 0;

  return (
    <div className="space-y-4">
      {/* Date line */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Данные на <span className="font-medium text-foreground">{fmtDate(data.scanDate)}</span></span>
        {hasCompare && data.compareScanDate && (
          <span>· сравнение с <span className="font-medium text-foreground">{fmtDate(data.compareScanDate)}</span></span>
        )}
      </div>

      {/* Per-searcher breakdown (Яндекс / Google) */}
      {hasSearchers ? (
        <div className="space-y-5">
          {data.bySearcher.map((s) => (
            <SearcherSection key={`${s.name}-${s.regionName}`} s={s} />
          ))}
        </div>
      ) : (
        /* Fallback: old flat layout */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Запросов" value={data.totalKeywords.toLocaleString("ru-RU")} />
          {data.visibility !== null && (
            <KpiCard label="Видимость" value={`${data.visibility.toFixed(1)} %`} />
          )}
          <KpiCard label="ТОП-1"  value={String(data.top1)}  delta={diff(data.top1,  data.prevTop1)}  />
          <KpiCard label="ТОП-3"  value={String(data.top3)}  delta={diff(data.top3,  data.prevTop3)}  />
          <KpiCard label="ТОП-5"  value={String(data.top5)}  delta={diff(data.top5,  data.prevTop5)}  />
          <KpiCard label="ТОП-10" value={String(data.top10)} delta={diff(data.top10, data.prevTop10)} />
        </div>
      )}
    </div>
  );
}
