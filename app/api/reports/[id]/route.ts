import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      dateFrom: true,
      dateTo: true,
      generatedAt: true,
      createdAt: true,
      pdfPath: true,
      project: { select: { id: true, name: true } },
    },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
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
