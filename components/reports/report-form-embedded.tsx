"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import TemplateBuilder from "@/components/templates/template-builder";
import { BlockConfig } from "@/lib/blocks/defaults";

// ── Types ──────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
}

interface FullTemplate {
  id: string;
  name: string;
  blocksConfig: BlockConfig[];
}

// ── Date helpers ───────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function startOfLastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return toYMD(d);
}

function endOfLastMonth(): string {
  const d = new Date();
  d.setDate(0);
  return toYMD(d);
}

function startOfMonthOffset(isoDate: string, n: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return toYMD(d);
}

function endOfMonthOffset(isoDate: string, n: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  const d = new Date(y, m - n, 0);
  return toYMD(d);
}

function monthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

// ── Step indicator ─────────────────────────────────────────────────────────

const STEPS = ["Период", "Блоки отчёта", "Тексты"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
            i < current
              ? "bg-primary text-primary-foreground"
              : i === current
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}>
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-sm hidden sm:block ${i === current ? "font-medium" : "text-muted-foreground"}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ── Generating screen ──────────────────────────────────────────────────────

function GeneratingScreen({ reportId, slug }: { reportId: string; slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "READY") {
          clearInterval(interval);
          router.push(`/r/${slug}`);
        } else if (data.status === "ERROR") {
          clearInterval(interval);
          setError("Ошибка генерации отчёта. Проверьте подключение к Яндекс.Метрике.");
        }
      } catch {
        // network error, keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [reportId, slug, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="text-destructive text-lg font-medium">Ошибка генерации</div>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div>
        <p className="text-lg font-medium">Генерируем отчёт...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Получаем данные из Яндекс.Метрики. Это займёт несколько секунд.
        </p>
      </div>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  projectName: string;
  projectUrl: string;
}

export default function ReportFormEmbedded({ projectId, projectName, projectUrl }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [periodPreset, setPeriodPreset] = useState<"lastMonth" | "custom">("lastMonth");
  const [dateFrom, setDateFrom] = useState(startOfLastMonth());
  const [dateTo, setDateTo] = useState(endOfLastMonth());
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [comparePreset, setComparePreset] = useState<"prevMonth" | "custom">("prevMonth");
  const [compareFrom, setCompareFrom] = useState("");
  const [compareTo, setCompareTo] = useState("");

  // Report settings state
  const [attribution, setAttribution] = useState<"lastsign" | "first" | "last" | "auto" | "direct">("lastsign");
  const [withRobots, setWithRobots] = useState(true);
  const [crossDevice, setCrossDevice] = useState(true);

  // Step 1 state
  const [blocks, setBlocks] = useState<BlockConfig[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Step 2 state
  const [workDone, setWorkDone] = useState("");
  const [workPlan, setWorkPlan] = useState("");

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<{ id: string; slug: string } | null>(null);

  function domainFromUrl(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }

  // Load templates on mount
  useEffect(() => {
    fetch("/api/templates")
      .then(async (tr) => {
        const templatesData: Template[] = tr.ok ? await tr.json() : [];
        setTemplates(templatesData);
        const def = templatesData.find((t) => t.isDefault) ?? templatesData[0];
        if (def) setTemplateId(def.id);
      })
      .finally(() => setLoadingInit(false));
  }, []);

  // Auto-update title when period changes
  useEffect(() => {
    if (!dateFrom) return;
    const domain = domainFromUrl(projectUrl);
    const period = monthYear(dateFrom);
    setTitle(`Отчёт ${domain} за ${period}`);
  }, [dateFrom, projectUrl]);

  // Recalculate dates when preset changes
  useEffect(() => {
    if (periodPreset === "lastMonth") {
      setDateFrom(startOfLastMonth());
      setDateTo(endOfLastMonth());
    }
  }, [periodPreset]);

  // Recalculate compare dates
  useEffect(() => {
    if (!compareEnabled) {
      setCompareFrom("");
      setCompareTo("");
      return;
    }
    if (comparePreset === "prevMonth") {
      setCompareFrom(startOfMonthOffset(dateFrom, 1));
      setCompareTo(endOfMonthOffset(dateFrom, 1));
    }
  }, [compareEnabled, comparePreset, dateFrom, dateTo]);

  async function loadTemplateBlocks(id: string) {
    if (!id) return;
    setLoadingTemplate(true);
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const tpl: FullTemplate = await res.json();
        setBlocks(tpl.blocksConfig);
      }
    } finally {
      setLoadingTemplate(false);
    }
  }

  async function handleStep0Next() {
    if (!dateFrom || !dateTo) { toast.error("Укажите период"); return; }
    await loadTemplateBlocks(templateId);
    setStep(1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          templateId: templateId || undefined,
          title,
          dateFrom,
          dateTo,
          compareFrom: compareEnabled ? compareFrom : undefined,
          compareTo: compareEnabled ? compareTo : undefined,
          reportConfig: blocks,
          workDone: workDone || undefined,
          workPlan: workPlan || undefined,
          attribution,
          withRobots,
          crossDevice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при создании отчёта");
        return;
      }
      setGenerated({ id: data.id, slug: data.slug });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (generated) {
    return <GeneratingScreen reportId={generated.id} slug={generated.slug} />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {projectName}
        </button>
        <h1 className="text-2xl font-semibold">Новый отчёт</h1>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 0: Period & settings ────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          {loadingInit ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              {/* Template */}
              <div className="grid gap-1.5">
                <Label>Шаблон</Label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? " (по умолчанию)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report settings */}
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Настройки отчёта</p>

                {/* Attribution */}
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Модель атрибуции</Label>
                  <select
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value as typeof attribution)}
                    className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="lastsign">Последний значимый переход</option>
                    <option value="first">Первый переход</option>
                    <option value="last">Последний переход</option>
                    <option value="auto">Автоматическая</option>
                    <option value="direct">Последний переход из Директа</option>
                  </select>
                </div>

                {/* Robots */}
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Данные</Label>
                  <div className="flex gap-3">
                    {([
                      [true,  "С роботами"],
                      [false, "Без роботов"],
                    ] as const).map(([val, label]) => (
                      <label key={String(val)} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="withRobots"
                          checked={withRobots === val}
                          onChange={() => setWithRobots(val)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cross-device */}
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={crossDevice}
                    onChange={(e) => setCrossDevice(e.target.checked)}
                    className="rounded"
                  />
                  Учитывать кросс-девайс визиты
                </label>
              </div>

              {/* Period preset */}
              <div className="grid gap-1.5">
                <Label>Период</Label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    ["lastMonth", "Прошлый месяц"],
                    ["custom", "Произвольный"],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPeriodPreset(val)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        periodPreset === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {periodPreset === "custom" && (
                  <div className="flex gap-2 mt-1">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                )}
                {periodPreset !== "custom" && (
                  <p className="text-xs text-muted-foreground">{formatDisplay(dateFrom)} — {formatDisplay(dateTo)}</p>
                )}
              </div>

              {/* Compare toggle */}
              <div className="grid gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compareEnabled}
                    onChange={(e) => setCompareEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Сравнить с периодом</span>
                </label>
                {compareEnabled && (
                  <div className="pl-6 flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {([
                        ["prevMonth", "Предыдущий месяц"],
                        ["custom", "Произвольный"],
                      ] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setComparePreset(val)}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            comparePreset === val
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {comparePreset === "custom" ? (
                      <div className="flex gap-2">
                        <Input type="date" value={compareFrom} onChange={(e) => setCompareFrom(e.target.value)} />
                        <Input type="date" value={compareTo} onChange={(e) => setCompareTo(e.target.value)} />
                      </div>
                    ) : (
                      compareFrom && <p className="text-xs text-muted-foreground">{formatDisplay(compareFrom)} — {formatDisplay(compareTo)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="grid gap-1.5">
                <Label htmlFor="report-title">Название отчёта</Label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Отчёт за апрель 2025"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleStep0Next}>
                  Далее <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 1: Blocks ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {loadingTemplate ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <TemplateBuilder blocks={blocks} onChange={setBlocks} />
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
            <Button onClick={() => setStep(2)}>
              Далее <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Texts ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="work-done">Проделанная работа</Label>
            <textarea
              id="work-done"
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              rows={6}
              placeholder="Опишите что было сделано за период..."
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="work-plan">План работ</Label>
            <textarea
              id="work-plan"
              value={workPlan}
              onChange={(e) => setWorkPlan(e.target.value)}
              rows={6}
              placeholder="Опишите план на следующий период..."
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Сгенерировать
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
