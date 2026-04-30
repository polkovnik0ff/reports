"use client";

import { PositionsTableData, PositionsKeyword } from "@/lib/services/topvisor";

function posDiff(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null) return null;
  return prev - cur; // positive = improved (moved up)
}

function posLabel(p: number | null): string {
  if (p === null) return "—";
  return String(p);
}

function DiffBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium ml-1 ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"}{Math.abs(delta)}
    </span>
  );
}

function KeywordRow({ kw }: { kw: PositionsKeyword }) {
  const delta = posDiff(kw.position, kw.prevPosition);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 text-sm">{kw.name}</td>
      <td className="py-2 px-3 text-sm text-right tabular-nums">
        {posLabel(kw.position)}
        <DiffBadge delta={delta} />
      </td>
      {kw.prevPosition !== null && (
        <td className="py-2 px-3 text-sm text-right tabular-nums text-muted-foreground">
          {posLabel(kw.prevPosition)}
        </td>
      )}
    </tr>
  );
}

interface Props {
  data: PositionsTableData;
}

export function PositionsTableBlock({ data }: Props) {
  const hasCompare = data.groups.some((g) => g.keywords.some((k) => k.prevPosition !== null))
    || data.ungrouped.some((k) => k.prevPosition !== null);

  const allGroups = [
    ...data.groups,
    ...(data.ungrouped.length > 0 ? [{ id: -1, name: "Без группы", keywords: data.ungrouped }] : []),
  ];

  if (allGroups.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">Нет данных о позициях</p>
    );
  }

  return (
    <div className="space-y-6">
      {allGroups.map((group) => (
        <div key={group.id} className="rounded-xl border overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 border-b">
            <span className="text-sm font-semibold">{group.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">({group.keywords.length})</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Запрос</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Позиция</th>
                {hasCompare && (
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Пред.</th>
                )}
              </tr>
            </thead>
            <tbody>
              {group.keywords.map((kw) => (
                <KeywordRow key={kw.id} kw={kw} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
