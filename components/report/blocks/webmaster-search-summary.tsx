"use client";

import { WebmasterSearchSummaryData } from "@/lib/services/webmaster";

function diff(current: number, compare: number | undefined): { value: string; positive: boolean } | null {
  if (compare == null || compare === 0) return null;
  const pct = ((current - compare) / compare) * 100;
  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function DiffSup({ d }: { d: ReturnType<typeof diff> }) {
  if (!d) return null;
  return (
    <sup className={`ml-1 text-[10px] font-semibold ${d.positive ? "text-green-600" : "text-red-500"}`}>
      {d.value}
    </sup>
  );
}

interface Props {
  data: WebmasterSearchSummaryData;
}

export function WebmasterSearchSummaryBlock({ data }: Props) {
  const kpis = [
    {
      label: "Клики",
      value: data.clicks.toLocaleString("ru-RU"),
      d: diff(data.clicks, data.compareClicks),
    },
    {
      label: "Показы",
      value: data.impressions.toLocaleString("ru-RU"),
      d: diff(data.impressions, data.compareImpressions),
    },
    {
      label: "CTR",
      value: `${(data.ctr * 100).toFixed(2)}%`,
      d: diff(data.ctr, data.compareCtr),
    },
    {
      label: "Средняя позиция",
      value: data.position > 0 ? data.position.toFixed(1) : "—",
      d: (() => {
        const d = diff(data.position, data.comparePosition);
        if (!d) return null;
        return { value: d.value, positive: !d.positive };
      })(),
    },
  ];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">{data.hostUrl}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold tabular-nums">
              {kpi.value}
              <DiffSup d={kpi.d} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
