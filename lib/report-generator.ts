import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { MetrikaClient, AttributionModel } from "@/lib/services/metrika";
import { TopvisorClient } from "@/lib/services/topvisor";
import { WebmasterClient } from "@/lib/services/webmaster";
import { fetchPositionsSummary } from "@/lib/blocks/positions_summary";
import { fetchPositionsTable } from "@/lib/blocks/positions_table";
import { fetchWebmasterIkh } from "@/lib/blocks/webmaster_ikh";
import { fetchWebmasterIndexing } from "@/lib/blocks/webmaster_indexing";
import { fetchWebmasterBacklinks } from "@/lib/blocks/webmaster_backlinks";
import { fetchWebmasterSearchSummary } from "@/lib/blocks/webmaster_search_summary";
import { fetchGscSummary } from "@/lib/blocks/gsc_summary";
import { GscClient } from "@/lib/services/gsc";
import { encryptToken } from "@/lib/crypto";
import { getTopvisorCredentials } from "@/lib/topvisor-settings";
import { BlockConfig, BlockType } from "@/lib/blocks/defaults";
import OpenAI from "openai";

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBlockData(
  client: MetrikaClient,
  block: BlockConfig,
  counterId: number,
  date1: string,
  date2: string,
  compareDate1?: string,
  compareDate2?: string,
  siteUrl?: string
): Promise<unknown> {
  const type = block.type as BlockType;

  switch (type) {
    case "traffic_summary":
      return client.getTrafficSummary(counterId, date1, date2, compareDate1, compareDate2);
    case "traffic_channels":
    case "test_block":
      return client.getTrafficByChannels(counterId, date1, date2, compareDate1, compareDate2);
    case "traffic_search_engines":
      return client.getTrafficBySearchEngines(counterId, date1, date2, compareDate1, compareDate2);
    case "search_engines_dynamics":
      return client.getSearchEnginesDynamics(counterId, date1, date2);
    case "traffic_search_dynamics":
      return client.getSearchEnginesDynamics(counterId, date1, date2);
    case "traffic_yoy":
      return client.getTrafficYoY(counterId, date1, date2);
    case "traffic_geography":
      return client.getGeography(counterId, date1, date2, compareDate1, compareDate2);
    case "traffic_devices":
      return client.getDevices(counterId, date1, date2, compareDate1, compareDate2);
    case "top_pages":
      return client.getTopPages(counterId, date1, date2, compareDate1, compareDate2);
    case "top_queries":
      return client.getTopQueries(counterId, date1, date2, compareDate1, compareDate2);
    case "referrals":
      return client.getReferrals(counterId, date1, date2, compareDate1, compareDate2);
    case "high_bounce_pages":
      return client.getHighBouncePages(counterId, date1, date2, siteUrl, compareDate1, compareDate2);
    case "work_done":
    case "work_plan":
    case "custom_text":
    case "custom_kpi":
    case "positions_summary":
    case "positions_table":
    case "webmaster_ikh":
    case "webmaster_indexing":
    case "webmaster_backlinks":
      return null; // handled separately
    default:
      return null;
  }
}

export async function generateReport(reportId: string): Promise<void> {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: {
          include: { connectedAccount: true },
        },
      },
    });

    if (!report) throw new Error(`Report ${reportId} not found`);

    const encryptedToken = report.project.connectedAccount.accessToken;
    const token = decryptToken(encryptedToken);
    const metrikaClient = new MetrikaClient(token, {
      attribution: report.attribution as AttributionModel,
      withRobots:  report.withRobots,
      crossDevice: report.crossDevice,
    });

    const counterId = report.project.metrikaCounterId;
    const date1 = fmt(report.dateFrom);
    const date2 = fmt(report.dateTo);
    const compareDate1 = report.compareFrom ? fmt(report.compareFrom) : undefined;
    const compareDate2 = report.compareTo ? fmt(report.compareTo) : undefined;

    const blocks = report.reportConfig as unknown as BlockConfig[];
    const metrikaBlockTypes: BlockType[] = [
      "traffic_summary", "traffic_channels", "traffic_search_engines",
      "search_engines_dynamics", "traffic_search_dynamics", "traffic_yoy",
      "traffic_geography", "traffic_devices", "top_pages", "top_queries",
      "referrals", "high_bounce_pages", "test_block",
    ];
    const topvisorBlockTypes: BlockType[] = ["positions_summary", "positions_table"];
    const webmasterBlockTypes: BlockType[] = ["webmaster_ikh", "webmaster_indexing", "webmaster_backlinks", "webmaster_search_summary"];
    const gscBlockTypes: BlockType[] = ["gsc_summary"];

    const enabledBlocks = blocks.filter((b) => b.enabled);
    const snapshotData: Record<string, unknown> = {};

    // ── Metrika blocks: sequential with delay to avoid 429 ─────────────────
    for (let i = 0; i < enabledBlocks.length; i++) {
      const block = enabledBlocks[i];
      if (!metrikaBlockTypes.includes(block.type as BlockType)) continue;

      if (i > 0) await sleep(300);

      try {
        const data = await fetchBlockData(
          metrikaClient,
          block,
          counterId,
          date1,
          date2,
          compareDate1,
          compareDate2,
          report.project.url
        );
        snapshotData[block.id] = { data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[generateReport] block ${block.id} failed:`, message);
        snapshotData[block.id] = { error: message };
      }
    }

    // ── Topvisor blocks ─────────────────────────────────────────────────────
    const topvisorBlocks = enabledBlocks.filter((b) =>
      topvisorBlockTypes.includes(b.type as BlockType)
    );

    if (topvisorBlocks.length > 0) {
      let topvisorClient: TopvisorClient | null = null;

      if (report.topvisorProjectId) {
        const creds = await getTopvisorCredentials();
        if (creds) {
          topvisorClient = new TopvisorClient(creds.userId, creds.apiKey);
        }
      }

      for (const block of topvisorBlocks) {
        if (!topvisorClient || !report.topvisorProjectId) {
          const reason = !report.topvisorProjectId
            ? "Не выбран проект Topvisor"
            : "Не настроены ключи Topvisor в Настройках";
          snapshotData[block.id] = { error: reason };
          continue;
        }

        try {
          const posSettings = {
            scanDate: block.settings?.scanDate as string | undefined,
            compareScanDate: block.settings?.compareScanDate as string | undefined,
            groupIds: block.settings?.groupIds as number[] | undefined,
          };
          let data: unknown;
          if (block.type === "positions_summary") {
            data = await fetchPositionsSummary(
              topvisorClient,
              report.topvisorProjectId,
              posSettings,
            );
          } else {
            data = await fetchPositionsTable(
              topvisorClient,
              report.topvisorProjectId,
              posSettings,
            );
          }
          snapshotData[block.id] = { data };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[generateReport] topvisor block ${block.id} failed:`, message);
          snapshotData[block.id] = { error: message };
        }
      }
    }

    // ── Webmaster blocks ────────────────────────────────────────────────────
    const webmasterBlocks = enabledBlocks.filter((b) =>
      webmasterBlockTypes.includes(b.type as BlockType)
    );

    if (webmasterBlocks.length > 0) {
      const webmasterAccount = report.webmasterAccountId
        ? await prisma.connectedAccount.findFirst({
            where: { id: report.webmasterAccountId, service: "YANDEX_WEBMASTER", status: "CONNECTED" },
          })
        : null;

      for (const block of webmasterBlocks) {
        if (!webmasterAccount || !report.webmasterHostId) {
          const reason = !report.webmasterAccountId
            ? "Не выбран аккаунт Яндекс Вебмастера"
            : !report.webmasterHostId
            ? "Не выбран сайт в Вебмастере"
            : "Аккаунт Вебмастера недоступен";
          snapshotData[block.id] = { error: reason };
          continue;
        }

        try {
          const wmToken = decryptToken(webmasterAccount.accessToken);
          const wmClient = new WebmasterClient(wmToken);
          let data: unknown;
          if (block.type === "webmaster_ikh") {
            // ИКС: всегда за 3 месяца до конца отчётного периода
            const ikhTo = report.dateTo;
            const ikhFrom = new Date(ikhTo);
            ikhFrom.setMonth(ikhFrom.getMonth() - 3);
            data = await fetchWebmasterIkh(wmClient, report.webmasterHostId, fmt(ikhFrom), fmt(ikhTo));
          } else if (block.type === "webmaster_indexing") {
            data = await fetchWebmasterIndexing(wmClient, report.webmasterHostId, date1, date2);
          } else if (block.type === "webmaster_search_summary") {
            data = await fetchWebmasterSearchSummary(wmClient, report.webmasterHostId, date1, date2, compareDate1, compareDate2);
          } else {
            data = await fetchWebmasterBacklinks(wmClient, report.webmasterHostId, date1, date2);
          }
          snapshotData[block.id] = { data };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[generateReport] webmaster block ${block.id} failed:`, message);
          snapshotData[block.id] = { error: message };
        }
      }
    }

    // ── GSC blocks ─────────────────────────────────────────────────────────
    const gscBlocks = enabledBlocks.filter((b) =>
      gscBlockTypes.includes(b.type as BlockType)
    );

    if (gscBlocks.length > 0) {
      const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

      const gscAccount = report.gscAccountId
        ? await prisma.connectedAccount.findFirst({
            where: { id: report.gscAccountId, service: "GOOGLE_SEARCH_CONSOLE", status: "CONNECTED" },
          })
        : null;

      for (const block of gscBlocks) {
        if (!gscAccount || !report.gscSiteUrl) {
          const reason = !report.gscAccountId
            ? "Не выбран аккаунт Google Search Console"
            : !report.gscSiteUrl
            ? "Не выбран сайт в GSC"
            : "Аккаунт GSC недоступен";
          snapshotData[block.id] = { error: reason };
          continue;
        }

        try {
          const token = decryptToken(gscAccount.accessToken);
          const refreshToken = gscAccount.refreshToken ? decryptToken(gscAccount.refreshToken) : null;
          const gscClient = new GscClient(token, refreshToken, clientId, clientSecret, async (newToken, expiresAt) => {
            await prisma.connectedAccount.update({
              where: { id: gscAccount.id },
              data: { accessToken: encryptToken(newToken), expiresAt },
            });
          });

          const data = await fetchGscSummary(
            gscClient,
            report.gscSiteUrl,
            date1,
            date2,
            compareDate1,
            compareDate2,
          );
          snapshotData[block.id] = { data };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[generateReport] gsc block ${block.id} failed:`, message);
          snapshotData[block.id] = { error: message };
        }
      }
    }

    // ── Manual blocks: pass through from reportConfig ───────────────────────
    for (const block of enabledBlocks) {
      if (
        block.type === "work_done" ||
        block.type === "conclusions" ||
        block.type === "work_plan" ||
        block.type === "custom_text" ||
        block.type === "custom_kpi"
      ) {
        snapshotData[block.id] = { data: null };
      }
    }

    // ── AI conclusions ───────────────────────────────────────────────────────
    const conclusionsBlock = enabledBlocks.find((b) => b.type === "conclusions");
    const openAiKey = process.env.OPENAI_SECRET_KEY || process.env.OPENAI_API_KEY;
    if (conclusionsBlock?.settings?.aiConclusions && openAiKey) {
      try {
        const aiContent = await generateAiConclusions({
          projectName: report.project.name,
          projectUrl: report.project.url,
          dateFrom: date1,
          dateTo: date2,
          compareFrom: compareDate1,
          compareTo: compareDate2,
          snapshotData,
          blocks: enabledBlocks,
        });
        // Inject into reportConfig so renderer picks it up from block.settings.content
        const updatedConfig = (report.reportConfig as unknown as BlockConfig[]).map((b) => {
          if (b.type === "conclusions") {
            return { ...b, settings: { ...b.settings, content: aiContent } };
          }
          return b;
        });
        await prisma.report.update({
          where: { id: reportId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { reportConfig: updatedConfig as any },
        });
      } catch (err) {
        console.error("[generateReport] AI conclusions failed:", err instanceof Error ? err.message : err);
      }
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        snapshotData: snapshotData as any,
        status: "READY",
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generateReport] failed for ${reportId}:`, message);
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "ERROR" },
    }).catch(() => {});
  }
}

// ── AI conclusions helper ────────────────────────────────────────────────────

interface AiConclusionsInput {
  projectName: string;
  projectUrl: string;
  dateFrom: string;
  dateTo: string;
  compareFrom?: string;
  compareTo?: string;
  snapshotData: Record<string, unknown>;
  blocks: BlockConfig[];
}

function pct(val?: number | null): string {
  return val != null ? `${val.toFixed(1)}%` : "—";
}

function num(val?: number | null): string {
  return val != null ? String(Math.round(val)) : "—";
}

function diff(cur?: number | null, prev?: number | null): string {
  if (cur == null || prev == null || prev === 0) return "";
  const d = Math.round(((cur - prev) / prev) * 100);
  return d > 0 ? ` (+${d}% к периоду сравнения)` : d < 0 ? ` (${d}% к периоду сравнения)` : " (без изменений)";
}

async function generateAiConclusions(input: AiConclusionsInput): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY || process.env.OPENAI_API_KEY });

  const sections: string[] = [];

  for (const block of input.blocks) {
    const snap = input.snapshotData[block.id] as { data?: unknown } | undefined;
    if (!snap?.data) continue;
    const d = snap.data as Record<string, unknown>;

    // ── Трафик: сводка ────────────────────────────────────────────────────────
    if (block.type === "traffic_summary") {
      const cur = d.current as Record<string, unknown> | undefined;
      const prev = d.previous as Record<string, unknown> | undefined;
      if (cur) {
        let line = `## Общая посещаемость\nВизиты: ${num(cur.visits as number)}${diff(cur.visits as number, prev?.visits as number)}, пользователи: ${num(cur.users as number)}${diff(cur.users as number, prev?.users as number)}, отказы: ${pct(cur.bounceRate as number)}${diff(cur.bounceRate as number, prev?.bounceRate as number)}, глубина: ${(cur.pageDepth as number)?.toFixed(1) ?? "—"} стр., время: ${Math.round((cur.avgDuration as number ?? 0) / 60)} мин.`;
        if (prev) line += `\nПериод сравнения: визиты ${num(prev.visits as number)}, пользователи ${num(prev.users as number)}, отказы ${pct(prev.bounceRate as number)}.`;
        sections.push(line);
      }
    }

    // ── Каналы трафика ────────────────────────────────────────────────────────
    if (block.type === "traffic_channels" && Array.isArray(d.rows)) {
      const rows = d.rows as Array<Record<string, unknown>>;
      const lines = rows.slice(0, 6).map((r) => {
        const hasPrev = r.prevVisits != null;
        return `  - ${r.name ?? r.id}: ${num(r.visits as number)} визитов${hasPrev ? diff(r.visits as number, r.prevVisits as number) : ""}`;
      });
      sections.push(`## Каналы трафика\n${lines.join("\n")}`);
    }

    // ── Поисковые системы (распределение) ────────────────────────────────────
    if (block.type === "traffic_search_engines" && Array.isArray(d.rows)) {
      const rows = d.rows as Array<Record<string, unknown>>;
      const lines = rows.map((r) => {
        const hasPrev = r.prevVisits != null;
        return `  - ${r.name}: ${num(r.visits as number)} визитов${hasPrev ? diff(r.visits as number, r.prevVisits as number) : ""}`;
      });
      sections.push(`## Поисковые системы (распределение)\n${lines.join("\n")}`);
    }

    // ── Динамика поискового трафика по дням ───────────────────────────────────
    if (block.type === "traffic_search_dynamics") {
      const dates = d.dates as string[] | undefined;
      const series = d.series as Array<Record<string, unknown>> | undefined;
      if (series && dates) {
        const lines = series.map((s) => {
          const data = s.data as number[];
          const total = data.reduce((a, b) => a + b, 0);
          const first = data[0] ?? 0;
          const last = data[data.length - 1] ?? 0;
          const trend = last > first ? "рост" : last < first ? "снижение" : "стабильно";
          return `  - ${s.name}: итого ${num(total)}, тренд: ${trend}`;
        });
        sections.push(`## Динамика поискового трафика\n${lines.join("\n")}`);
      }
    }

    // ── Позиции ───────────────────────────────────────────────────────────────
    if (block.type === "positions_summary") {
      const bySearcher = d.bySearcher as Array<Record<string, unknown>> | undefined;
      const scanDate = d.scanDate as string | undefined;
      const compareScanDate = d.compareScanDate as string | undefined;
      if (bySearcher) {
        const dateInfo = scanDate ? ` (съёмка ${scanDate}${compareScanDate ? `, сравнение ${compareScanDate}` : ""})` : "";
        const lines = bySearcher.map((s) => {
          const name = `${s.searcherName ?? s.name} (${s.regionName ?? ""})`;
          let line = `  - ${name}: всего ${num(s.total as number ?? s.totalKeywords as number)}, ТОП-1: ${num(s.top1 as number)}${diff(s.top1 as number, s.prevTop1 as number)}, ТОП-3: ${num(s.top3 as number)}${diff(s.top3 as number, s.prevTop3 as number)}, ТОП-5: ${num(s.top5 as number)}${diff(s.top5 as number, s.prevTop5 as number)}, ТОП-10: ${num(s.top10 as number)}${diff(s.top10 as number, s.prevTop10 as number)}`;
          return line;
        });
        sections.push(`## Позиции в поисковых системах${dateInfo}\n${lines.join("\n")}`);
      }
    }

    // ── Яндекс Вебмастер: поисковые запросы ──────────────────────────────────
    if (block.type === "webmaster_search_summary") {
      const cur = d.clicks != null ? d : (d.current as Record<string, unknown> | undefined);
      const prev = d.compareClicks != null ? d : (d.compare as Record<string, unknown> | undefined);
      if (cur) {
        const clicks = (cur.clicks ?? cur.totalClicks) as number;
        const impressions = (cur.impressions ?? cur.totalShows) as number;
        const ctr = (cur.ctr ?? cur.avgCtr) as number;
        const pos = (cur.position ?? cur.avgClickPosition) as number;
        const prevClicks = (prev?.clicks ?? prev?.totalClicks ?? cur.compareClicks) as number | undefined;
        const prevImpressions = (prev?.impressions ?? prev?.totalShows ?? cur.compareImpressions) as number | undefined;
        sections.push(`## Яндекс Вебмастер — поисковые запросы\nКлики: ${num(clicks)}${diff(clicks, prevClicks)}, показы: ${num(impressions)}${diff(impressions, prevImpressions)}, CTR: ${pct(ctr ? ctr * 100 : null)}, ср. позиция: ${pos?.toFixed(1) ?? "—"}`);
      }
    }

    // ── Яндекс Вебмастер: ИКС ────────────────────────────────────────────────
    if (block.type === "webmaster_ikh") {
      const points = (d.points ?? d.history) as Array<Record<string, unknown>> | undefined;
      if (points && points.length > 0) {
        const last = points[points.length - 1];
        const first = points[0];
        sections.push(`## Индекс качества сайта (ИКС)\nТекущий: ${num(last.value as number)} (${last.date}), начало периода: ${num(first.value as number)} (${first.date})${diff(last.value as number, first.value as number)}`);
      }
    }

    // ── Яндекс Вебмастер: индексация ─────────────────────────────────────────
    if (block.type === "webmaster_indexing") {
      if (d.currentIndexed != null) {
        sections.push(`## Страницы в поиске (Яндекс)\nИндексируется: ${num(d.currentIndexed as number)}, исключено: ${num(d.currentExcluded as number)}`);
      }
    }

    // ── Яндекс Вебмастер: ссылки ─────────────────────────────────────────────
    if (block.type === "webmaster_backlinks") {
      const points = (d.points ?? d.history) as Array<Record<string, unknown>> | undefined;
      if (points && points.length > 0) {
        const last = points[points.length - 1];
        const first = points[0];
        sections.push(`## Внешние ссылки (Яндекс)\nТекущее кол-во: ${num(last.value as number)}${diff(last.value as number, first.value as number)}`);
      }
    }

    // ── Google Search Console ─────────────────────────────────────────────────
    if (block.type === "gsc_summary") {
      const clicks = d.clicks as number;
      const impressions = d.impressions as number;
      const ctr = d.ctr as number;
      const position = d.position as number;
      const prevClicks = d.compareClicks as number | undefined;
      const prevImpressions = d.compareImpressions as number | undefined;
      const prevPosition = d.comparePosition as number | undefined;
      sections.push(`## Google Search Console\nКлики: ${num(clicks)}${diff(clicks, prevClicks)}, показы: ${num(impressions)}${diff(impressions, prevImpressions)}, CTR: ${pct(ctr ? ctr * 100 : null)}, ср. позиция: ${position?.toFixed(1) ?? "—"}${diff(position, prevPosition) ? ` (позиция: ${diff(position, prevPosition)})` : ""}`);
    }
  }

  const metricsText = sections.length > 0 ? sections.join("\n\n") : "Данные метрик недоступны.";

  const hasCompare = input.compareFrom && input.compareTo;
  const compareInfo = hasCompare
    ? `Период сравнения: ${input.compareFrom} — ${input.compareTo}\n`
    : "";

  const prompt = `Ты — опытный SEO-аналитик. Напиши профессиональные выводы для SEO-отчёта на русском языке.

Сайт: ${input.projectName} (${input.projectUrl})
Отчётный период: ${input.dateFrom} — ${input.dateTo}
${compareInfo}
---
ДАННЫЕ ОТЧЁТА:

${metricsText}
---

Требования к тексту:
- Объём: 4–6 абзацев
- Стиль: деловой, конкретный, без воды и общих фраз
- Используй данные сравнения (если есть) — отмечай рост или снижение
- Интерпретируй цифры, а не просто перечисляй их
- Выдели ключевые достижения и зоны роста
- Если есть данные по позициям — прокомментируй ТОП-1/3/10 отдельно по Яндексу и Google
- Если есть данные GSC и Вебмастера — свяжи их с трафиком
- Верни чистый HTML (только теги <p>, <ul>, <li>, <strong>) без обёртки \`\`\`html`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
