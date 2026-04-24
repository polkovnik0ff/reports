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

const createSchema = z.object({
  projectId: z.string().min(1),
  templateId: z.string().optional(),
  title: z.string().min(1).max(300),
  dateFrom: z.string(),
  dateTo: z.string(),
  compareFrom: z.string().optional(),
  compareTo: z.string().optional(),
  reportConfig: z.array(z.any()),
  workDone: z.string().optional(),
  workPlan: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const { projectId, templateId, title, dateFrom, dateTo, compareFrom, compareTo, reportConfig, workDone, workPlan } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 });

  // Embed work text into reportConfig blocks so generator can access them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalConfig: any[] = reportConfig.map((block: any) => {
    if (block.type === "work_done" && workDone) return { ...block, settings: { ...block.settings, content: workDone } };
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
    },
  });

  // Fire-and-forget: do not await
  generateReport(report.id).catch((e) =>
    console.error("[POST /api/reports] generateReport failed:", e)
  );

  return NextResponse.json({ id: report.id, slug: report.slug, status: "GENERATING" }, { status: 202 });
}
