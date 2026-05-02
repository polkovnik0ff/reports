"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface ReportHeaderProps {
  title: string;
  slug: string;
  dateFrom: Date;
  dateTo: Date;
  compareFrom?: Date | null;
  compareTo?: Date | null;
  generatedAt?: Date | null;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ReportHeader({ title, slug, dateFrom, dateTo, compareFrom, compareTo }: ReportHeaderProps) {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";
  const [loading, setLoading] = useState(false);

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
    <div className="mb-10 pb-6 border-b border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 text-base">
            Период: {fmtDate(dateFrom)} — {fmtDate(dateTo)}
          </p>
          {compareFrom && compareTo && (
            <p className="text-gray-500 text-sm mt-1">
              В сравнении с: {fmtDate(compareFrom)} — {fmtDate(compareTo)}
            </p>
          )}
        </div>
        {!isPrint && (
          <button
            onClick={handleDownload}
            disabled={loading}
            className="no-print shrink-0 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Генерация…" : "Скачать PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
