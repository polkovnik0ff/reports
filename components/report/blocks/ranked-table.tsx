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

function DiffBadge({ cur, prev, hasCompare }: { cur: number; prev?: number; hasCompare?: boolean }) {
  if (prev == null) {
    if (!hasCompare) return null;
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--r-green)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>↑100%</span>
    );
  }
  const d = pctDiff(cur, prev);
  if (d == null) return null;
  const up = d > 0;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: up ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
      {up ? "↑" : "↓"}{Math.abs(d).toFixed(1)}%
    </span>
  );
}

function toHref(name: string, linkType: "full-url" | "domain"): string {
  if (linkType === "full-url") return name;
  return name.startsWith("http") ? name : `https://${name}`;
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
};

const TD: React.CSSProperties = {
  fontFamily: "var(--r-f-body)",
  fontSize: 13,
  color: "var(--r-ink-dim)",
  padding: "11px 14px",
  borderBottom: "1px solid var(--r-hairline)",
};

export function RankedTable({ data, labelHeader, truncateUrl = false, linkType }: RankedTableProps) {
  const rows = data?.rows ?? [];
  const hasCompare = rows.some((r) => r.prevVisits != null);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "center", width: 44 }}>№</th>
            <th style={{ ...TH, textAlign: "left" }}>{labelHeader}</th>
            <th style={{ ...TH, textAlign: "right" }}>Визиты</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              <td style={{ ...TD, textAlign: "center", fontFamily: "var(--r-f-mono)", fontSize: 12, color: "var(--r-ink-mute)" }}>
                {i + 1}
              </td>
              <td style={{ ...TD, maxWidth: 480, wordBreak: "break-all" }}>
                {linkType ? (
                  <a
                    href={toHref(row.name, linkType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--r-cyan)", textDecoration: "none", fontFamily: "var(--r-f-mono)", fontSize: 12 }}
                  >
                    {truncateUrl ? truncate(row.name) : row.name}
                  </a>
                ) : (
                  <span style={{ color: "var(--r-ink)" }}>{truncateUrl ? truncate(row.name) : row.name}</span>
                )}
              </td>
              <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                {row.visits.toLocaleString("ru-RU")}
                <DiffBadge cur={row.visits} prev={row.prevVisits} hasCompare={hasCompare} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
