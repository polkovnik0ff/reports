"use client";

import { useState } from "react";
import { PositionsTableData, PositionsKeyword } from "@/lib/services/topvisor";

const PREVIEW_ROWS = 5;

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
      fontSize: 9,
      fontWeight: 700,
      color: up ? "var(--r-green)" : "var(--r-red)",
      marginLeft: 3,
      verticalAlign: "super",
      lineHeight: 1,
    }}>
      {up ? "▲" : "▼"}{Math.abs(delta)}
    </span>
  );
}

function CollapseIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
    >
      <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function GroupTable({
  group,
  hasCompare,
  scanDate,
  compareScanDate,
}: {
  group: { id: number; name: string; keywords: PositionsKeyword[] };
  hasCompare: boolean;
  scanDate: string | null;
  compareScanDate: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = group.keywords.length;
  const canCollapse = total > PREVIEW_ROWS;
  const visibleKeywords = canCollapse && !expanded ? group.keywords.slice(0, PREVIEW_ROWS) : group.keywords;

  return (
    <div style={{
      border: "1px solid var(--r-hairline)",
      borderRadius: "var(--r-radius-s)",
      overflow: "hidden",
    }}>
      {/* Group header */}
      <div
        style={{
          background: "var(--r-bg-card-2)",
          padding: "12px 16px",
          borderBottom: "1px solid var(--r-hairline)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
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
        }}>{total}</span>
        {canCollapse && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--r-f-mono)",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--r-ink-mute)",
              background: "var(--r-hairline-2)",
              border: "1px solid var(--r-hairline)",
              borderRadius: 5,
              padding: "4px 10px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--r-ink)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--r-ink-mute)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--r-ink-mute)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--r-hairline)";
            }}
          >
            <CollapseIcon expanded={expanded} />
            {expanded ? "Свернуть" : `Показать все ${total}`}
          </button>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "left" }}>Запрос</th>
            <th style={{ ...TH, textAlign: "right" }}>
              {scanDate ? fmtDate(scanDate) : "Позиция"}
            </th>
            {hasCompare && (
              <th style={{ ...TH, textAlign: "right" }}>
                {compareScanDate ? fmtDate(compareScanDate) : "Пред."}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleKeywords.map((kw, i) => (
            <KeywordRow key={kw.id ?? i} kw={kw} hasCompare={hasCompare} idx={i} />
          ))}
        </tbody>
      </table>

      {/* Show more / show less footer */}
      {canCollapse && (
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{
            padding: "10px 16px",
            background: "var(--r-bg-card-2)",
            borderTop: "1px solid var(--r-hairline)",
            fontFamily: "var(--r-f-mono)",
            fontSize: 11,
            color: "var(--r-ink-mute)",
            cursor: "pointer",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {expanded ? (
            <>
              <CollapseIcon expanded={true} />
              Свернуть
            </>
          ) : (
            <>
              <CollapseIcon expanded={false} />
              Показать ещё {total - PREVIEW_ROWS}
            </>
          )}
        </div>
      )}
    </div>
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
          <GroupTable
            key={group.id}
            group={group}
            hasCompare={hasCompare}
            scanDate={data.scanDate}
            compareScanDate={data.compareScanDate}
          />
        ))}
      </div>
    </div>
  );
}
