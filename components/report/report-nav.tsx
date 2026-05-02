"use client";

import { useEffect, useRef, useState } from "react";

interface NavItem {
  id: string;
  label: string;
}

interface ReportNavProps {
  items: NavItem[];
  slug: string;
}

export function ReportNav({ items, slug }: ReportNavProps) {
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
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav className="sticky top-6 w-52 shrink-0 hidden lg:flex flex-col self-start">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={`w-full text-left text-xs px-3 py-1.5 rounded transition-colors leading-snug ${
                  isActive
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-8">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17h-.75v.75a.75.75 0 0 1-1.5 0V17H5.5a.5.5 0 0 1 0-1H6.25v-.75a.75.75 0 0 1 1.5 0V16h.75a.5.5 0 0 1 0 1zm4.25-3.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm4.5-1.25h-1.5v4h1.5a2 2 0 0 0 0-4zm-1.5 1.5h1.5a.5.5 0 0 1 0 1h-1.5v-1z"/>
          </svg>
          {loading ? "Генерация…" : "Скачать PDF"}
        </button>
      </div>
    </nav>
  );
}
