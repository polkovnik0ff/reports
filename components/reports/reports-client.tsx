"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Trash2, ExternalLink, Copy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  slug: string;
  title: string;
  status: "GENERATING" | "READY" | "ERROR";
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  project: { id: string; name: string; url: string };
}

function StatusBadge({ status }: { status: Report["status"] }) {
  if (status === "READY")
    return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Готов</Badge>;
  if (status === "ERROR")
    return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Ошибка</Badge>;
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Генерация
    </Badge>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportsClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) setReports(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    // Poll generating reports every 5s
    const interval = setInterval(async () => {
      setReports((prev) => {
        const hasGenerating = prev.some((r) => r.status === "GENERATING");
        if (!hasGenerating) return prev;
        return prev;
      });
      const hasGenerating = (await fetch("/api/reports").then((r) => r.json()).catch(() => [])).some(
        (r: Report) => r.status === "GENERATING"
      );
      if (hasGenerating) fetchReports();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  async function handleDelete(report: Report) {
    setDeletingId(report.id);
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка при удалении"); return; }
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success("Отчёт удалён");
    } finally {
      setDeletingId(null);
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована"));
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">История отчётов</h1>
        <a href="/reports/new" className={cn(buttonVariants({ variant: "default" }))}>
          + Новый отчёт
        </a>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Отчётов пока нет</p>
          <a href="/reports/new" className={cn(buttonVariants({ variant: "outline" }))}>
            Создать первый отчёт
          </a>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Отчёт</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Проект</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Период</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{report.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtDate(report.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {report.project.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {fmtDate(report.dateFrom)} — {fmtDate(report.dateTo)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {report.status === "READY" && (
                        <>
                          <a
                            href={`${appUrl}/r/${report.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}
                            title="Открыть отчёт"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Скопировать ссылку"
                            onClick={() => copyLink(report.slug)}
                            className="text-muted-foreground"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        disabled={deletingId === report.id}
                        onClick={() => handleDelete(report)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === report.id ? (
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
