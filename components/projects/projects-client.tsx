"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  FolderOpen,
  Loader2,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface ConnectedAccount {
  email: string;
  name: string | null;
}

interface Project {
  id: string;
  name: string;
  url: string;
  metrikaCounterId: number;
  createdAt: string;
  connectedAccount: ConnectedAccount;
  _count: { reports: number };
}

interface Counter {
  counterId: number;
  counterName: string;
  counterSite: string;
  accountEmail: string;
  connectedAccountId: string;
}

// ── Add project dialog ─────────────────────────────────────────────────────

function AddProjectDialog({ onAdded }: { onAdded: (p: Project) => void }) {
  const [open, setOpen] = useState(false);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [selected, setSelected] = useState<Counter | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCounters() {
    setLoadingCounters(true);
    try {
      const res = await fetch("/api/projects/counters");
      if (res.ok) setCounters(await res.json());
      else toast.error("Не удалось загрузить счётчики");
    } finally {
      setLoadingCounters(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelected(null);
      setName("");
      setUrl("");
      loadCounters();
    }
  }

  function selectCounter(c: Counter) {
    setSelected(c);
    setName(c.counterName);
    setUrl(c.counterSite ? `https://${c.counterSite}` : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrikaCounterId: selected.counterId,
          name,
          url,
          connectedAccountId: selected.connectedAccountId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при добавлении");
        return;
      }

      toast.success("Проект добавлен");
      onAdded(data);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button />}
      >
        + Добавить проект
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Добавить проект</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Counter list */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Выберите счётчик Яндекс.Метрики:
            </p>
            <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto">
              {loadingCounters ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : counters.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Нет доступных счётчиков.{" "}
                  <a
                    href="/sources"
                    className={cn(
                      buttonVariants({ variant: "link" }),
                      "h-auto p-0 text-sm"
                    )}
                  >
                    Подключите Яндекс.Метрику
                  </a>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        Счётчик
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                        Сайт
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                        Аккаунт
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {counters.map((c) => {
                      const isSelected = selected?.counterId === c.counterId;
                      return (
                        <tr
                          key={`${c.connectedAccountId}-${c.counterId}`}
                          onClick={() => selectCounter(c)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium">{c.counterName}</div>
                            <div className="text-xs text-muted-foreground">
                              #{c.counterId}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {c.counterSite}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                            {c.accountEmail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Name & URL fields */}
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="proj-name">Название проекта</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Мой сайт"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proj-url">URL сайта</Label>
              <Input
                id="proj-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Отмена
            </DialogClose>
            <Button type="submit" disabled={!selected || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit project dialog ────────────────────────────────────────────────────

function EditProjectDialog({
  project,
  onSaved,
}: {
  project: Project;
  onSaved: (p: Project) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.url);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при сохранении");
        return;
      }
      toast.success("Проект обновлён");
      onSaved(data);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setName(project.name);
      setUrl(project.url);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title="Редактировать"
            className="text-muted-foreground"
          />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Редактировать проект</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Название</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Отмена
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page component ────────────────────────────────────────────────────

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function handleAdded(project: Project) {
    setProjects((prev) => [project, ...prev]);
  }

  function handleSaved(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDelete(project: Project) {
    if (project._count.reports > 0) {
      toast.error("Нельзя удалить проект с отчётами");
      return;
    }
    setDeletingId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при удалении");
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success("Проект удалён");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Мои проекты</h1>
        <AddProjectDialog onAdded={handleAdded} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground max-w-sm">
            Проектов пока нет. Нажмите «+ Добавить проект», чтобы выбрать
            счётчик Яндекс.Метрики.
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Проект
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Счётчик
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Аккаунт
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Отчётов
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{project.name}</div>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
                    >
                      {project.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    #{project.metrikaCounterId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {project.connectedAccount.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {project._count.reports}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <EditProjectDialog
                        project={project}
                        onSaved={handleSaved}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === project.id}
                        onClick={() => handleDelete(project)}
                        title="Удалить"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === project.id ? (
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
