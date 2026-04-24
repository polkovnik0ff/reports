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

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ReportHeader({ title, dateFrom, dateTo, compareFrom, compareTo, generatedAt }: ReportHeaderProps) {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get("print") === "1";

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
            onClick={() => window.print()}
            className="no-print shrink-0 px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            Скачать PDF
          </button>
        )}
      </div>
    </div>
  );
}
