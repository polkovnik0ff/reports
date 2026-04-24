import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { MetrikaClient } from "@/lib/services/metrika";
import { BlockConfig, BlockType } from "@/lib/blocks/defaults";

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
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
    case "traffic_search_dynamics":
      return client.getSearchDynamics(counterId, date1, date2, compareDate1, compareDate2);
    case "traffic_yoy":
      return client.getTrafficYoY(counterId, date1, date2);
    case "traffic_geography":
      return client.getGeography(counterId, date1, date2);
    case "traffic_devices":
      return client.getDevices(counterId, date1, date2);
    case "top_pages":
      return client.getTopPages(counterId, date1, date2, compareDate1, compareDate2);
    case "top_queries":
      return client.getTopQueries(counterId, date1, date2, compareDate1, compareDate2);
    case "referrals":
      return client.getReferrals(counterId, date1, date2);
    case "high_bounce_pages":
      return client.getHighBouncePages(counterId, date1, date2);
    // Manual blocks — data already in reportConfig, no API call needed
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
    const client = new MetrikaClient(token);

    const counterId = report.project.metrikaCounterId;
    const date1 = fmt(report.dateFrom);
    const date2 = fmt(report.dateTo);
    const compareDate1 = report.compareFrom ? fmt(report.compareFrom) : undefined;
    const compareDate2 = report.compareTo ? fmt(report.compareTo) : undefined;

    const blocks = report.reportConfig as unknown as BlockConfig[];
    const enabledBlocks = blocks.filter((b) => b.enabled);

    const snapshotData: Record<string, unknown> = {};

    await Promise.allSettled(
      enabledBlocks.map(async (block) => {
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
          snapshotData[block.id] = { error: message };
        }
      })
    );

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
