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
import { getTopvisorCredentials } from "@/lib/topvisor-settings";
import { BlockConfig, BlockType } from "@/lib/blocks/defaults";

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
      "referrals", "high_bounce_pages",
    ];
    const topvisorBlockTypes: BlockType[] = ["positions_summary", "positions_table"];
    const webmasterBlockTypes: BlockType[] = ["webmaster_ikh", "webmaster_indexing", "webmaster_backlinks"];

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
            data = await fetchWebmasterIkh(wmClient, report.webmasterHostId, date1, date2);
          } else if (block.type === "webmaster_indexing") {
            data = await fetchWebmasterIndexing(wmClient, report.webmasterHostId, date1, date2);
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

    // ── Manual blocks: pass through from reportConfig ───────────────────────
    for (const block of enabledBlocks) {
      if (
        block.type === "work_done" ||
        block.type === "work_plan" ||
        block.type === "custom_text" ||
        block.type === "custom_kpi"
      ) {
        snapshotData[block.id] = { data: null };
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
