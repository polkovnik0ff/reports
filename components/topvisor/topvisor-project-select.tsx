"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface TopvisorProject {
  id: number;
  name: string;
  site: string;
}

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
}

export function TopvisorProjectSelect({ value, onChange, label = "Проект Topvisor" }: Props) {
  const [projects, setProjects] = useState<TopvisorProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/topvisor/projects")
      .then(async (r) => {
        if (r.status === 422) {
          setError("Настройте ключи Topvisor в Настройках");
          return;
        }
        if (!r.ok) {
          setError("Ошибка загрузки проектов Topvisor");
          return;
        }
        const data = await r.json();
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch(() => setError("Ошибка загрузки проектов Topvisor"))
      .finally(() => setLoading(false));
  }, []);

  const options = projects.map((p) => ({
    value: String(p.id),
    label: p.name,
    sublabel: p.site,
  }));

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground h-8">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Загрузка...
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : projects.length === 0 ? (
        <p className="text-xs text-muted-foreground">Проекты не найдены</p>
      ) : (
        <SearchableSelect
          options={options}
          value={value != null ? String(value) : ""}
          onChange={(v) => onChange(v ? Number(v) : null)}
          placeholder="— не выбран —"
          searchPlaceholder="Поиск по названию или сайту..."
          emptyText="Проекты не найдены"
        />
      )}
    </div>
  );
}
