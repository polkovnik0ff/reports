"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Group {
  id: number;
  name: string;
}

interface ScanSettings {
  scanDate?: string;
  compareScanDate?: string;
  groupIds?: number[];
  regionIndex?: number;
}

interface Props {
  topvisorProjectId: number | null;
  value: ScanSettings;
  onChange: (v: ScanSettings) => void;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function TopvisorScanSettings({ topvisorProjectId, value, onChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [existsDates, setExistsDates] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topvisorProjectId) {
      setExistsDates([]);
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/settings/topvisor/project-meta?projectId=${topvisorProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        const dates = Array.isArray(data.existsDates) ? data.existsDates : [];
        setExistsDates(dates);
        setGroups(Array.isArray(data.groups) ? data.groups : []);

        // Always persist explicit scanDate, compareScanDate and regionIndex so the
        // generator never falls back to "auto" mode (which ignores user's "no compare" choice).
        const datesDesc = [...dates].reverse();
        const updates: Record<string, unknown> = {};
        if (data.regionIndex != null) updates.regionIndex = data.regionIndex;
        if (!value.scanDate && datesDesc[0]) updates.scanDate = datesDesc[0];
        // Only set compareScanDate if user hasn't touched it yet (undefined = not set)
        if (value.compareScanDate === undefined) {
          updates.compareScanDate = datesDesc[1] ?? "";
        }
        if (Object.keys(updates).length > 0) {
          onChange({ ...value, ...updates });
        }
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topvisorProjectId]);

  if (!topvisorProjectId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Загрузка дат сканирования…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (existsDates.length === 0) {
    return <p className="text-xs text-muted-foreground">Нет данных о сканированиях</p>;
  }

  // Dates in descending order for UI
  const datesDesc = [...existsDates].reverse();
  const selectedScan = value.scanDate ?? datesDesc[0];
  const selectedCompare = value.compareScanDate ?? "";

  function setScanDate(d: string) {
    onChange({ ...value, scanDate: d });
  }

  function setCompareScanDate(d: string) {
    // "" = user explicitly chose "no comparison" (stored as ""); undefined = not yet set (auto)
    onChange({ ...value, compareScanDate: d });
  }

  function toggleGroup(id: number) {
    // When groupIds is undefined it means "all selected" — expand to full list before toggling
    const current = value.groupIds ?? groups.map((g) => g.id);
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
    // If every group is selected, collapse back to undefined
    const allSelected = next.length === groups.length;
    onChange({ ...value, groupIds: allSelected ? undefined : next.length > 0 ? next : [] });
  }

  function selectAllGroups() {
    onChange({ ...value, groupIds: undefined });
  }

  function clearAllGroups() {
    onChange({ ...value, groupIds: [] });
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Scan date */}
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Дата сканирования</Label>
        <select
          value={selectedScan}
          onChange={(e) => setScanDate(e.target.value)}
          className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {datesDesc.map((d) => (
            <option key={d} value={d}>{fmtDate(d)}</option>
          ))}
        </select>
      </div>

      {/* Compare scan date */}
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Сравнение (дата)</Label>
        <select
          value={selectedCompare}
          onChange={(e) => setCompareScanDate(e.target.value)}
          className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— без сравнения —</option>
          {datesDesc.filter((d) => d !== selectedScan).map((d) => (
            <option key={d} value={d}>{fmtDate(d)}</option>
          ))}
        </select>
      </div>

      {/* Groups filter */}
      {groups.length > 0 && (
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Группы запросов</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllGroups}
                className="text-xs text-primary hover:underline"
              >
                Выбрать всё
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearAllGroups}
                className="text-xs text-primary hover:underline"
              >
                Убрать всё
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-foreground">
                <input
                  type="checkbox"
                  checked={value.groupIds === undefined || value.groupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                  className="rounded shrink-0"
                />
                <span className="text-xs truncate">{g.name}</span>
              </label>
            ))}
          </div>
          {value.groupIds !== undefined && (
            <p className="text-xs text-muted-foreground">
              {value.groupIds.length === 0
                ? "Ни одна группа не выбрана"
                : `Выбрано групп: ${value.groupIds.length} из ${groups.length}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
