"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, RefreshCw, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import TemplateBuilder from "@/components/templates/template-builder";
import { TopvisorProjectSelect } from "@/components/topvisor/topvisor-project-select";
import { BlockConfig } from "@/lib/blocks/defaults";

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

// ── Tab types ──────────────────────────────────────────────────────────────

type Tab = "params" | "blocks" | "texts";

const TABS: { id: Tab; label: string }[] = [
  { id: "params", label: "Параметры" },
  { id: "blocks", label: "Блоки" },
  { id: "texts", label: "Тексты" },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  reportId: string;
  slug: string;
  projectId: string;
  projectName: string;
  projectUrl: string;
  initialTitle: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialCompareFrom: string;
  initialCompareTo: string;
  initialAttribution: "lastsign" | "first" | "last" | "auto" | "direct";
  initialWithRobots: boolean;
  initialCrossDevice: boolean;
  initialBlocks: BlockConfig[];
  initialTopvisorProjectId?: number | null;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ReportEditor({
  reportId,
  slug,
  projectId,
  projectName,
  initialTitle,
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  initialAttribution,
  initialWithRobots,
  initialCrossDevice,
  initialBlocks,
  initialTopvisorProjectId,
}: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [tab, setTab] = useState<Tab>("params");

  // Params tab state
  const [title, setTitle] = useState(initialTitle);
  const [periodPreset, setPeriodPreset] = useState<"lastMonth" | "custom">(
    initialDateFrom === startOfLastMonth() && initialDateTo === endOfLastMonth() ? "lastMonth" : "custom"
  );
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [compareEnabled, setCompareEnabled] = useState(!!initialCompareFrom);
  const [comparePreset, setComparePreset] = useState<"prevMonth" | "custom">("custom");
  const [compareFrom, setCompareFrom] = useState(initialCompareFrom);
  const [compareTo, setCompareTo] = useState(initialCompareTo);
  const [attribution, setAttribution] = useState(initialAttribution);
  const [withRobots, setWithRobots] = useState(initialWithRobots);
  const [crossDevice, setCrossDevice] = useState(initialCrossDevice);
  const [topvisorProjectId, setTopvisorProjectId] = useState<number | null>(initialTopvisorProjectId ?? null);

  // Blocks tab state
  const [blocks, setBlocks] = useState<BlockConfig[]>(initialBlocks);

  // Texts tab state — extract from blocks
  const [workDone, setWorkDone] = useState(
    () => (initialBlocks.find((b) => b.type === "work_done")?.settings?.content as string) ?? ""
  );
  const [workPlan, setWorkPlan] = useState(
    () => (initialBlocks.find((b) => b.type === "work_plan")?.settings?.content as string) ?? ""
  );

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Recalculate period dates when preset changes
  useEffect(() => {
    if (periodPreset === "lastMonth") {
      setDateFrom(startOfLastMonth());
      setDateTo(endOfLastMonth());
    }
  }, [periodPreset]);

  // Recalculate compare dates when preset/dateFrom changes
  useEffect(() => {
    if (!compareEnabled) {
      return;
    }
    if (comparePreset === "prevMonth") {
      setCompareFrom(startOfMonthOffset(dateFrom, 1));
      setCompareTo(endOfMonthOffset(dateFrom, 1));
    }
  }, [compareEnabled, comparePreset, dateFrom, dateTo]);

  // Poll for report status after generation kicks off
  const pollStatus = useCallback(async () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "READY") {
          clearInterval(interval);
          setGenerating(false);
          setPreviewKey((k) => k + 1);
          toast.success("Отчёт обновлён");
        } else if (data.status === "ERROR") {
          clearInterval(interval);
          setGenerating(false);
          toast.error("Ошибка генерации. Проверьте подключение к Яндекс.Метрике.");
        }
      } catch {
        // network, keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [reportId]);

  async function handleGenerate() {
    setGenerating(true);

    // Merge workDone/workPlan into blocks
    const finalBlocks = blocks.map((block) => {
      if (block.type === "work_done" && workDone) return { ...block, settings: { ...block.settings, content: workDone } };
      if (block.type === "work_plan" && workPlan) return { ...block, settings: { ...block.settings, content: workPlan } };
      return block;
    });

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dateFrom,
          dateTo,
          compareFrom: compareEnabled && compareFrom ? compareFrom : null,
          compareTo: compareEnabled && compareTo ? compareTo : null,
          reportConfig: finalBlocks,
          attribution,
          withRobots,
          crossDevice,
          topvisorProjectId: topvisorProjectId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при обновлении");
        setGenerating(false);
        return;
      }
      pollStatus();
    } catch {
      toast.error("Ошибка сети");
      setGenerating(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована"));
  }

  const previewUrl = `/r/${slug}`;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {projectName}
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`${appUrl}/r/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть
          </a>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="h-4 w-4" />
            Скопировать ссылку
          </button>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Генерация…</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-1.5" />Сгенерировать</>
            )}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — editor */}
        <div className="w-[420px] shrink-0 flex flex-col border-r overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* ── Params tab ─────────────────────────────────────────── */}
            {tab === "params" && (
              <div className="flex flex-col gap-5">
                {/* Title */}
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-title">Название отчёта</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Report settings */}
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Настройки</p>

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

                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Данные</Label>
                    <div className="flex gap-3">
                      {([
                        [true, "С роботами"],
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

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={crossDevice}
                      onChange={(e) => setCrossDevice(e.target.checked)}
                      className="rounded"
                    />
                    Учитывать кросс-девайс визиты
                  </label>

                  <TopvisorProjectSelect
                    value={topvisorProjectId}
                    onChange={setTopvisorProjectId}
                  />
                </div>

                {/* Period */}
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
                  {periodPreset === "custom" ? (
                    <div className="flex gap-2 mt-1">
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{formatDisplay(dateFrom)} — {formatDisplay(dateTo)}</p>
                  )}
                </div>

                {/* Compare */}
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compareEnabled}
                      onChange={(e) => {
                        setCompareEnabled(e.target.checked);
                        if (!e.target.checked) { setCompareFrom(""); setCompareTo(""); }
                      }}
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
                        compareFrom && (
                          <p className="text-xs text-muted-foreground">{formatDisplay(compareFrom)} — {formatDisplay(compareTo)}</p>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Blocks tab ─────────────────────────────────────────── */}
            {tab === "blocks" && (
              <TemplateBuilder blocks={blocks} onChange={setBlocks} />
            )}

            {/* ── Texts tab ──────────────────────────────────────────── */}
            {tab === "texts" && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label>Проделанная работа</Label>
                  <RichTextEditor
                    content={workDone}
                    onChange={setWorkDone}
                    placeholder="Опишите что было сделано за отчётный период..."
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>План работ</Label>
                  <RichTextEditor
                    content={workPlan}
                    onChange={setWorkPlan}
                    placeholder="Опишите план работ на следующий период..."
                  />
                </div>
              </div>
            )}

          </div>

          {/* Bottom generate button */}
          <div className="border-t p-4 shrink-0">
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Генерация…</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-1.5" />Сгенерировать отчёт</>
              )}
            </Button>
          </div>
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
            <span className="text-xs text-muted-foreground font-medium">Предпросмотр</span>
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Обновить
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            {generating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Генерируем отчёт…</p>
                </div>
              </div>
            )}
            <iframe
              key={previewKey}
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title="Предпросмотр отчёта"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
