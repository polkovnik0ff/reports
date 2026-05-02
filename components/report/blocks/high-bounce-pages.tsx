"use client";

function truncate(s: string, max = 70) {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DiffBadge({ cur, prev, invertSign = false, hasCompare = false }: { cur: number; prev?: number; invertSign?: boolean; hasCompare?: boolean }) {
  if (prev == null) {
    if (!hasCompare) return null;
    const good = !invertSign;
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color: good ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
        ↑100%
      </span>
    );
  }
  const diff = pctDiff(cur, prev);
  if (diff == null) return null;
  const up = diff > 0;
  const good = invertSign ? !up : up;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: good ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
      {up ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}%
    </span>
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

export function HighBouncePagesBlock({ data }: { data: HighBouncePagesData }) {
  const rows = data?.rows ?? [];
  const hasCompare = rows.some((r) => r.prevVisits != null);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "center", width: 44 }}>№</th>
            <th style={{ ...TH, textAlign: "left" }}>URL</th>
            <th style={{ ...TH, textAlign: "right" }}>Визиты</th>
            <th style={{ ...TH, textAlign: "right" }}>Отказы</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              <td style={{ ...TD, textAlign: "center", fontFamily: "var(--r-f-mono)", fontSize: 12, color: "var(--r-ink-mute)" }}>
                {i + 1}
              </td>
              <td style={{ ...TD, maxWidth: 480, wordBreak: "break-all" }}>
                <a
                  href={row.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--r-cyan)", textDecoration: "none", fontFamily: "var(--r-f-mono)", fontSize: 12 }}
                >
                  {truncate(row.name)}
                </a>
              </td>
              <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                {row.visits.toLocaleString("ru-RU")}
                <DiffBadge cur={row.visits} prev={row.prevVisits} hasCompare={hasCompare} />
              </td>
              <td style={{
                ...TD,
                textAlign: "right",
                fontFamily: "var(--r-f-mono)",
                fontWeight: 500,
                color: row.bounceRate >= 50 ? "var(--r-red)" : "var(--r-ink)",
              }}>
                {row.bounceRate.toFixed(1)}%
                <DiffBadge cur={row.bounceRate} prev={row.prevBounceRate} invertSign hasCompare={hasCompare} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
