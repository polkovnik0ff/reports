"use client";

import { WebmasterSearchSummaryData } from "@/lib/services/webmaster";

function diff(current: number, compare: number | undefined): { value: string; positive: boolean } | null {
  if (compare == null || compare === 0) return null;
  const pct = ((current - compare) / compare) * 100;
  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

interface Props {
  data: WebmasterSearchSummaryData;
}

export function WebmasterSearchSummaryBlock({ data }: Props) {
  const kpis = [
    {
      label: "Клики",
      value: data.clicks.toLocaleString("ru-RU"),
      d: diff(data.clicks, data.compareClicks),
    },
    {
      label: "Показы",
      value: data.impressions.toLocaleString("ru-RU"),
      d: diff(data.impressions, data.compareImpressions),
    },
    {
      label: "CTR",
      value: `${(data.ctr * 100).toFixed(2)}%`,
      d: diff(data.ctr, data.compareCtr),
    },
    {
      label: "Средняя позиция",
      value: data.position > 0 ? data.position.toFixed(1) : "—",
      d: (() => {
        const dd = diff(data.position, data.comparePosition);
        if (!dd) return null;
        return { value: dd.value, positive: !dd.positive };
      })(),
    },
  ];

  return (
    <div>
      <p style={{
        fontFamily: "var(--r-f-mono)",
        fontSize: 11,
        color: "var(--r-ink-mute)",
        marginBottom: 24,
        letterSpacing: "0.5px",
      }}>
        {data.hostUrl}
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
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
            }}>{kpi.label}</p>
            <p style={{
              fontFamily: "var(--r-f-display)",
              fontWeight: 700,
              fontSize: 36,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "var(--r-ink)",
              marginBottom: kpi.d ? 8 : 0,
            }}>{kpi.value}</p>
            {kpi.d && (
              <span style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: kpi.d.positive ? "var(--r-green)" : "var(--r-red)",
                background: kpi.d.positive ? "rgba(74,222,128,0.1)" : "rgba(255,89,99,0.1)",
                borderRadius: 4,
                padding: "2px 6px",
                display: "inline-block",
              }}>
                {kpi.d.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
