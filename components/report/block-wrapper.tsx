"use client";

interface BlockWrapperProps {
  id: string;
  title: string;
  sectionNum?: number;
  commentAbove?: string;
  commentBelow?: string;
  children: React.ReactNode;
}

export function BlockWrapper({ id, title, sectionNum, commentAbove, commentBelow, children }: BlockWrapperProps) {
  return (
    <div id={id} className="report-block" style={{ marginTop: 96, scrollMarginTop: 24 }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: "1px solid var(--r-hairline)",
        gap: 24,
      }}>
        <div>
          {sectionNum != null && (
            <span style={{
              fontFamily: "var(--r-f-mono)",
              fontSize: 12,
              letterSpacing: "1.5px",
              color: "var(--r-accent)",
              display: "block",
              marginBottom: 12,
              textTransform: "uppercase",
            }}>
              {String(sectionNum).padStart(2, "0")}
            </span>
          )}
          <h2 style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: "clamp(28px, 3vw, 44px)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "var(--r-ink)",
          }}>
            {title}
          </h2>
        </div>
      </div>

      {commentAbove && (
        <div
          className="prose-report"
          style={{ marginBottom: 24, color: "var(--r-ink-dim)", fontSize: 14, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: commentAbove }}
        />
      )}

      {children}

      {commentBelow && (
        <div
          className="prose-report"
          style={{ marginTop: 24, color: "var(--r-ink-dim)", fontSize: 14, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: commentBelow }}
        />
      )}
    </div>
  );
}
