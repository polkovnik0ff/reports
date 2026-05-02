import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReport } from "@/lib/report-generator";
import { unlink } from "fs/promises";
import { join } from "path";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const full = req.nextUrl.searchParams.get("full") === "1";

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      dateFrom: true,
      dateTo: true,
      compareFrom: true,
      compareTo: true,
      generatedAt: true,
      createdAt: true,
      pdfPath: true,
      attribution: true,
      withRobots: true,
      crossDevice: true,
      topvisorProjectId:  true,
      webmasterAccountId: true,
      webmasterHostId:    true,
      ...(full && { reportConfig: true }),
      project: { select: { id: true, name: true, url: true } },
    },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

const ATTRIBUTION_VALUES = ["lastsign", "first", "last", "auto", "direct"] as const;

const patchSchema = z.object({
  title:             z.string().min(1).max(300).optional(),
  dateFrom:          z.string().optional(),
  dateTo:            z.string().optional(),
  compareFrom:       z.string().nullable().optional(),
  compareTo:         z.string().nullable().optional(),
  reportConfig:      z.array(z.any()).optional(),
  attribution:       z.enum(ATTRIBUTION_VALUES).optional(),
  withRobots:        z.boolean().optional(),
  crossDevice:       z.boolean().optional(),
  workDone:          z.string().optional(),
  workPlan:          z.string().optional(),
  topvisorProjectId:  z.number().int().positive().nullable().optional(),
  webmasterAccountId: z.string().nullable().optional(),
  webmasterHostId:    z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const {
    title, dateFrom, dateTo, compareFrom, compareTo,
    reportConfig, attribution, withRobots, crossDevice,
    workDone, workPlan, topvisorProjectId,
    webmasterAccountId, webmasterHostId,
  } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalConfig: any[] | undefined = reportConfig;
  if (reportConfig && (workDone != null || workPlan != null)) {
    finalConfig = reportConfig.map((block: any) => {
      if (block.type === "work_done" && workDone) return { ...block, settings: { ...block.settings, content: workDone } };
      if (block.type === "work_plan" && workPlan) return { ...block, settings: { ...block.settings, content: workPlan } };
      return block;
    });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title }),
      ...(dateFrom    !== undefined && { dateFrom: new Date(dateFrom) }),
      ...(dateTo      !== undefined && { dateTo: new Date(dateTo) }),
      ...(compareFrom !== undefined && { compareFrom: compareFrom ? new Date(compareFrom) : null }),
      ...(compareTo   !== undefined && { compareTo: compareTo ? new Date(compareTo) : null }),
      ...(finalConfig !== undefined && { reportConfig: finalConfig as any }),
      ...(attribution !== undefined && { attribution }),
      ...(withRobots         !== undefined && { withRobots }),
      ...(crossDevice        !== undefined && { crossDevice }),
      ...(topvisorProjectId  !== undefined && { topvisorProjectId: topvisorProjectId ?? null }),
      ...(webmasterAccountId !== undefined && { webmasterAccountId: webmasterAccountId ?? null }),
      ...(webmasterHostId    !== undefined && { webmasterHostId: webmasterHostId ?? null }),
      status: "GENERATING",
      snapshotData: undefined,
    },
  });

  // Save chosen integrations as project defaults for next time
  await prisma.project.update({
    where: { id: updated.projectId },
    data: {
      ...(topvisorProjectId  !== undefined && { defaultTopvisorProjectId:  topvisorProjectId ?? null }),
      ...(webmasterAccountId !== undefined && { defaultWebmasterAccountId: webmasterAccountId ?? null }),
      ...(webmasterHostId    !== undefined && { defaultWebmasterHostId:    webmasterHostId ?? null }),
    },
  });

  generateReport(updated.id).catch((e) =>
    console.error("[PATCH /api/reports/[id]] generateReport failed:", e)
  );

  return NextResponse.json({ id: updated.id, slug: updated.slug, status: "GENERATING" });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true, pdfPath: true } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (report.pdfPath) {
    const abs = join(process.cwd(), "public", report.pdfPath);
    await unlink(abs).catch(() => {});
  }

  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
