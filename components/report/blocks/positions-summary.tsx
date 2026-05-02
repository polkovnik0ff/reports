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
  const sign = delta == null ? null : delta > 0 ? "+" : delta < 0 ? "−" : null;
  const abs  = delta != null ? Math.abs(delta) : 0;
  const good = delta != null && (higherIsBetter ? delta > 0 : delta < 0);
  const bad  = delta != null && (higherIsBetter ? delta < 0 : delta > 0);

  return (
    <div style={{
      background: "var(--r-bg-card)",
      border: "1px solid var(--r-hairline)",
      borderRadius: "var(--r-radius-s)",
      padding: "20px 24px",
    }}>
      <p style={{
        fontFamily: "var(--r-f-mono)",
        fontSize: 11,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "var(--r-ink-mute)",
        marginBottom: 10,
      }}>{label}</p>
      <p style={{
        fontFamily: "var(--r-f-display)",
        fontWeight: 700,
        fontSize: 36,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: "var(--r-ink)",
        marginBottom: sign !== null ? 8 : 0,
      }}>{value}</p>
      {sign !== null && (
        <span style={{
          fontFamily: "var(--r-f-mono)",
          fontSize: 12,
          fontWeight: 600,
          color: good ? "var(--r-green)" : bad ? "var(--r-red)" : "var(--r-ink-mute)",
          background: good ? "rgba(74,222,128,0.1)" : bad ? "rgba(255,89,99,0.1)" : "transparent",
          borderRadius: 4,
          padding: "2px 6px",
          display: "inline-block",
        }}>
          {sign}{abs}
        </span>
      )}
    </div>
  );
}

function SearcherSection({ s }: { s: SearcherSummary }) {
  const hasCompare = s.prevTop1 !== null;
  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", gap: 12 }}>
        <h4 style={{
          fontFamily: "var(--r-f-display)",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--r-ink)",
        }}>
          {s.name}
        </h4>
        {s.regionName && (
          <span style={{ fontFamily: "var(--r-f-mono)", fontSize: 11, color: "var(--r-ink-mute)" }}>
            {s.regionName}
          </span>
        )}
        <span style={{ fontFamily: "var(--r-f-mono)", fontSize: 11, color: "var(--r-ink-mute)" }}>
          {s.totalKeywords} запросов
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
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
    <div>
      {/* Date line */}
      <div style={{
        fontFamily: "var(--r-f-mono)",
        fontSize: 11,
        color: "var(--r-ink-mute)",
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span>Данные на <span style={{ color: "var(--r-ink-dim)", fontWeight: 600 }}>{fmtDate(data.scanDate)}</span></span>
        {hasCompare && data.compareScanDate && (
          <span>· сравнение с <span style={{ color: "var(--r-ink-dim)", fontWeight: 600 }}>{fmtDate(data.compareScanDate)}</span></span>
        )}
      </div>

      {hasSearchers ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {data.bySearcher.map((s) => (
            <SearcherSection key={`${s.name}-${s.regionName}`} s={s} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
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
