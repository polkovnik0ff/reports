"use client";

import { useSearchParams } from "next/navigation";

interface ReportHeaderProps {
  title: string;
  dateFrom: Date;
  dateTo: Date;
  compareFrom?: Date | null;
  compareTo?: Date | null;
  generatedAt?: Date | null;
}

function fmtShort(d: Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtPeriod(d: Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function domainFromTitle(title: string) {
  const m = title.match(/([a-z0-9а-яёА-ЯЁ][-a-z0-9а-яёА-ЯЁ.]+\.[a-zа-яё]{2,})/i);
  return m ? m[1] : null;
}

export function ReportHeader({ title, dateFrom, dateTo, compareFrom, compareTo, generatedAt }: ReportHeaderProps) {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";

  const domain = domainFromTitle(title);

  if (isPrint) {
    return (
      <div className="report-block" style={{ marginBottom: 40, paddingBottom: 24, borderBottom: "1px solid var(--r-hairline)" }}>
        <h1 style={{ fontFamily: "var(--r-f-display)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em", color: "var(--r-ink)", marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ fontFamily: "var(--r-f-mono)", fontSize: 12, color: "var(--r-ink-dim)" }}>
          {fmtShort(dateFrom)} — {fmtShort(dateTo)}
          {compareFrom && compareTo && ` · в сравнении с ${fmtShort(compareFrom)} — ${fmtShort(compareTo)}`}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 0 80px", position: "relative" }}>
      {/* Eyebrow */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--r-f-mono)",
        fontSize: 12,
        letterSpacing: "0.5px",
        color: "var(--r-ink-dim)",
        marginBottom: 32,
      }}>
        <span style={{ width: 28, height: 1, background: "var(--r-accent)", display: "block", flexShrink: 0 }} />
        SEO отчёт
      </div>

      {/* Hero title */}
      <h1 style={{
        fontFamily: "var(--r-f-display)",
        fontWeight: 800,
        fontSize: "clamp(48px, 6vw, 96px)",
        lineHeight: 0.95,
        letterSpacing: "-0.04em",
        color: "var(--r-ink)",
      }}>
        <span style={{ color: "var(--r-accent)" }}>SEO</span>
        {" "}отчёт
        {domain && (
          <div style={{ marginTop: "0.15em" }}>
            <span style={{
              display: "inline-block",
              fontStyle: "italic",
              fontWeight: 500,
              position: "relative",
            }}>
              {domain}
              <span style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "6px",
                height: 8,
                background: "var(--r-accent)",
                zIndex: -1,
                opacity: 0.9,
                display: "block",
              }} />
            </span>
          </div>
        )}
      </h1>

      {/* Subline: periods + actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 32,
        alignItems: "end",
        marginTop: 56,
        paddingTop: 32,
        borderTop: "1px solid var(--r-hairline)",
      }}>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          <div>
            <div style={{
              fontFamily: "var(--r-f-mono)",
              fontSize: 11,
              letterSpacing: "1px",
              color: "var(--r-ink-mute)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              Период
            </div>
            <div style={{
              fontFamily: "var(--r-f-display)",
              fontWeight: 600,
              fontSize: 18,
              color: "var(--r-ink)",
            }}>
              {fmtPeriod(dateFrom)}
              <span style={{ color: "var(--r-accent)", margin: "0 8px", fontWeight: 800 }}>→</span>
              {fmtPeriod(dateTo)}
            </div>
          </div>
          {compareFrom && compareTo && (
            <div>
              <div style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 11,
                letterSpacing: "1px",
                color: "var(--r-ink-mute)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                Сравнение
              </div>
              <div style={{
                fontFamily: "var(--r-f-display)",
                fontWeight: 600,
                fontSize: 18,
                color: "var(--r-ink-dim)",
              }}>
                {fmtPeriod(compareFrom)}
                <span style={{ color: "var(--r-ink-mute)", margin: "0 8px" }}>→</span>
                {fmtPeriod(compareTo)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
