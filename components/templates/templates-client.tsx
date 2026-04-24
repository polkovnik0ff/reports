"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutTemplate, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  blockCount: number;
}

export default function TemplatesClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleSetDefault(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => ({ ...t, isDefault: t.id === id }))
        );
        toast.success("Шаблон по умолчанию обновлён");
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(t: Template) {
    setActionId(t.id);
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при удалении");
        return;
      }
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Шаблон удалён");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Шаблоны отчётов</h1>
        <a
          href="/templates/new"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          + Создать шаблон
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Шаблонов пока нет</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Название</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Блоков</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      {t.isDefault && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">
                          По умолчанию
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {t.blockCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!t.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Сделать по умолчанию"
                          disabled={actionId === t.id}
                          onClick={() => handleSetDefault(t.id)}
                          className="text-muted-foreground hover:text-amber-500"
                        >
                          {actionId === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Редактировать"
                        onClick={() => router.push(`/templates/${t.id}`)}
                        className="text-muted-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        disabled={actionId === t.id}
                        onClick={() => handleDelete(t)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {actionId === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
