"use client";

import { useEffect, useRef, useState } from "react";

interface NavItem {
  id: string;
  label: string;
}

interface ReportNavProps {
  items: NavItem[];
  slug: string;
  title: string;
}

export function ReportNav({ items, slug, title }: ReportNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const visible = new Map<string, number>();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topId = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActiveId(topId);
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observerRef.current.observe(el);
    }
    return () => observerRef.current?.disconnect();
  }, [items]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${slug}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav
      className="report-nav sticky top-0 h-screen shrink-0 hidden lg:flex flex-col overflow-y-auto"
      style={{
        width: 240,
        padding: "32px 24px 32px 36px",
        borderRight: "1px solid var(--r-hairline)",
        gap: 24,
        scrollbarWidth: "thin",
        scrollbarColor: "var(--r-hairline-2) transparent",
      }}
    >
      {/* Brand */}
      <div style={{ paddingBottom: 20, borderBottom: "1px solid var(--r-hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.02em",
            color: "var(--r-ink)",
          }}>
            SEO<span style={{ color: "var(--r-accent)" }}>.</span>
          </span>
          <span style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "1.5px",
            color: "var(--r-ink-mute)",
            textTransform: "uppercase",
          }}>
            Report
          </span>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{
          fontFamily: "var(--r-f-mono)",
          fontSize: 10,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--r-ink-mute)",
          paddingBottom: 8,
        }}>
          Разделы
        </div>

        {items.map((item, idx) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr",
                gap: 10,
                alignItems: "center",
                padding: "8px 12px 8px 8px",
                borderRadius: 8,
                fontSize: 13,
                color: isActive ? "var(--r-ink)" : "var(--r-ink-dim)",
                background: isActive ? "var(--r-bg-card)" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
                transition: "color .15s, background .15s",
                width: "100%",
              }}
            >
              {isActive && (
                <span style={{
                  position: "absolute",
                  left: -36,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 24,
                  background: "var(--r-accent)",
                  borderRadius: "0 3px 3px 0",
                }} />
              )}
              <span style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.5px",
                color: isActive ? "var(--r-accent)" : "var(--r-ink-mute)",
                textAlign: "right",
              }}>
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span style={{ fontWeight: 500, lineHeight: 1.25 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* PDF button */}
      <div style={{ paddingTop: 16, borderTop: "1px solid var(--r-hairline)" }}>
        <button
          onClick={handleDownload}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 999,
            background: "var(--r-accent)",
            color: "#fff",
            border: "none",
            fontFamily: "var(--r-f-display)",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.3px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "background .2s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4v-2h14v2H5z"/>
          </svg>
          {loading ? "Генерация…" : "Скачать PDF"}
        </button>
      </div>
    </nav>
  );
}
