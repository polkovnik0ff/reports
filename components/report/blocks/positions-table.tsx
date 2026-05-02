"use client";

import { PositionsTableData, PositionsKeyword } from "@/lib/services/topvisor";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function posDiff(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null) return null;
  return prev - cur; // positive = improved
}

function posLabel(p: number | null): string {
  if (p === null) return "—";
  return String(p);
}

function DiffBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color: up ? "var(--r-green)" : "var(--r-red)",
      marginLeft: 6,
    }}>
      {up ? "▲" : "▼"}{Math.abs(delta)}
    </span>
  );
}

const TH: React.CSSProperties = {
  fontFamily: "var(--r-f-mono)",
  fontSize: 11,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color: "var(--r-ink-mute)",
  fontWeight: 500,
  padding: "10px 14px",
  borderBottom: "1px solid var(--r-hairline)",
  whiteSpace: "nowrap",
  background: "var(--r-bg-card-2)",
};

const TD: React.CSSProperties = {
  fontFamily: "var(--r-f-body)",
  fontSize: 13,
  color: "var(--r-ink-dim)",
  padding: "10px 14px",
  borderBottom: "1px solid var(--r-hairline)",
};

function KeywordRow({ kw, hasCompare, idx }: { kw: PositionsKeyword; hasCompare: boolean; idx: number }) {
  const delta = posDiff(kw.position, kw.prevPosition);
  return (
    <tr style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
      <td style={TD}>{kw.name}</td>
      <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
        {posLabel(kw.position)}
        <DiffBadge delta={delta} />
      </td>
      {hasCompare && (
        <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink-mute)" }}>
          {posLabel(kw.prevPosition)}
        </td>
      )}
    </tr>
  );
}

interface Props {
  data: PositionsTableData;
}

export function PositionsTableBlock({ data }: Props) {
  const hasCompare = data.compareScanDate !== null && (
    data.groups.some((g) => g.keywords.some((k) => k.prevPosition !== null))
    || data.ungrouped.some((k) => k.prevPosition !== null)
  );

  const allGroups = [
    ...data.groups,
    ...(data.ungrouped.length > 0 ? [{ id: -1, name: "Без группы", keywords: data.ungrouped }] : []),
  ];

  if (allGroups.length === 0) {
    return (
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--r-ink-mute)", padding: "32px 0" }}>
        Нет данных о позициях
      </p>
    );
  }

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

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {allGroups.map((group) => (
          <div key={group.id} style={{
            border: "1px solid var(--r-hairline)",
            borderRadius: "var(--r-radius-s)",
            overflow: "hidden",
          }}>
            {/* Group header */}
            <div style={{
              background: "var(--r-bg-card-2)",
              padding: "12px 16px",
              borderBottom: "1px solid var(--r-hairline)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{
                fontFamily: "var(--r-f-display)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--r-ink)",
              }}>{group.name}</span>
              <span style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 11,
                color: "var(--r-ink-mute)",
                background: "var(--r-hairline-2)",
                borderRadius: 4,
                padding: "2px 6px",
              }}>{group.keywords.length}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: "left" }}>Запрос</th>
                  <th style={{ ...TH, textAlign: "right" }}>
                    {data.scanDate ? fmtDate(data.scanDate) : "Позиция"}
                  </th>
                  {hasCompare && (
                    <th style={{ ...TH, textAlign: "right" }}>
                      {data.compareScanDate ? fmtDate(data.compareScanDate) : "Пред."}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {group.keywords.map((kw, i) => (
                  <KeywordRow key={kw.id ?? i} kw={kw} hasCompare={hasCompare} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
