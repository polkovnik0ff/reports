"use client";

import { useEffect, useRef, useState } from "react";

interface NavItem {
  id: string;
  label: string;
}

interface ReportNavProps {
  items: NavItem[];
}

export function ReportNav({ items }: ReportNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Track which sections are visible; pick the topmost one
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
          // The section closest to the top of the viewport wins
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

  return (
    <nav className="sticky top-6 w-52 shrink-0 hidden lg:block self-start">
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
    </nav>
  );
}
