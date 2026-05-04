import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReport } from "@/lib/report-generator";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

  const reports = await prisma.report.findMany({
    where: { ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      dateFrom: true,
      dateTo: true,
      createdAt: true,
      generatedAt: true,
      project: { select: { id: true, name: true, url: true } },
    },
  });

  return NextResponse.json(reports);
}

const ATTRIBUTION_VALUES = ["lastsign", "first", "last", "auto", "direct"] as const;

const createSchema = z.object({
  projectId:         z.string().min(1),
  templateId:        z.string().optional(),
  title:             z.string().min(1).max(300),
  dateFrom:          z.string(),
  dateTo:            z.string(),
  compareFrom:       z.string().optional(),
  compareTo:         z.string().optional(),
  reportConfig:      z.array(z.any()),
  workDone:          z.string().optional(),
  conclusions:       z.string().optional(),
  workPlan:          z.string().optional(),
  attribution:       z.enum(ATTRIBUTION_VALUES).default("lastsign"),
  withRobots:        z.boolean().default(false),
  crossDevice:       z.boolean().default(false),
  topvisorProjectId:  z.number().int().positive().nullable().optional(),
  webmasterAccountId: z.string().nullable().optional(),
  webmasterHostId:    z.string().nullable().optional(),
  gscAccountId:       z.string().nullable().optional(),
  gscSiteUrl:         z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const {
    projectId, templateId, title, dateFrom, dateTo,
    compareFrom, compareTo, reportConfig, workDone, conclusions, workPlan,
    attribution, withRobots, crossDevice, topvisorProjectId,
    webmasterAccountId, webmasterHostId, gscAccountId, gscSiteUrl,
  } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalConfig: any[] = reportConfig.map((block: any) => {
    if (block.type === "work_done" && workDone) return { ...block, settings: { ...block.settings, content: workDone } };
    if (block.type === "conclusions") return { ...block, settings: { ...block.settings, content: conclusions ?? "" } };
    if (block.type === "work_plan" && workPlan) return { ...block, settings: { ...block.settings, content: workPlan } };
    return block;
  });

  const slug = nanoid(10);

  const report = await prisma.report.create({
    data: {
      slug,
      title,
      projectId,
      templateId: templateId ?? null,
      createdById: session.userId,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      compareFrom: compareFrom ? new Date(compareFrom) : null,
      compareTo: compareTo ? new Date(compareTo) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reportConfig: finalConfig as any,
      status: "GENERATING",
      attribution,
      withRobots,
      crossDevice,
      topvisorProjectId:  topvisorProjectId ?? null,
      webmasterAccountId: webmasterAccountId ?? null,
      webmasterHostId:    webmasterHostId ?? null,
      gscAccountId:       gscAccountId ?? null,
      gscSiteUrl:         gscSiteUrl ?? null,
    },
  });

  // Save chosen integrations as project defaults for next time
  await prisma.project.update({
    where: { id: projectId },
    data: {
      defaultTopvisorProjectId:  topvisorProjectId ?? null,
      defaultWebmasterAccountId: webmasterAccountId ?? null,
      defaultWebmasterHostId:    webmasterHostId ?? null,
      defaultGscAccountId:       gscAccountId ?? null,
      defaultGscSiteUrl:         gscSiteUrl ?? null,
    },
  });

  generateReport(report.id).catch((e) =>
    console.error("[POST /api/reports] generateReport failed:", e)
  );

  return NextResponse.json({ id: report.id, slug: report.slug, status: "GENERATING" }, { status: 202 });
}
