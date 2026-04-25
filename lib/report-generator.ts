import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { MetrikaClient, AttributionModel } from "@/lib/services/metrika";
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
  compareDate2?: string
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
      return client.getReferrals(counterId, date1, date2);
    case "high_bounce_pages":
      return client.getHighBouncePages(counterId, date1, date2);
    case "work_done":
    case "work_plan":
    case "custom_text":
    case "custom_kpi":
    case "positions_summary":
    case "positions_table":
      return null;
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
    const client = new MetrikaClient(token, {
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
    // Only API blocks need sequential fetching; manual blocks return immediately
    const apiBlockTypes: BlockType[] = [
      "traffic_summary", "traffic_channels", "traffic_search_engines",
      "search_engines_dynamics", "traffic_search_dynamics", "traffic_yoy",
      "traffic_geography", "traffic_devices", "top_pages", "top_queries",
      "referrals", "high_bounce_pages",
    ];
    const enabledBlocks = blocks.filter((b) => b.enabled);

    const snapshotData: Record<string, unknown> = {};

    // Sequential fetch with 300ms delay to avoid Metrika 429 quota errors
    for (let i = 0; i < enabledBlocks.length; i++) {
      const block = enabledBlocks[i];
      const isApiBlock = apiBlockTypes.includes(block.type as BlockType);

      if (i > 0 && isApiBlock) {
        await sleep(300);
      }

      try {
        const data = await fetchBlockData(
          client,
          block,
          counterId,
          date1,
          date2,
          compareDate1,
          compareDate2
        );
        snapshotData[block.id] = { data };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[generateReport] block ${block.id} failed:`, message);
        snapshotData[block.id] = { error: message };
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
