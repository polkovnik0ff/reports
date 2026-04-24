import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      connectedAccount: { select: { email: true, name: true } },
      _count: { select: { reports: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().min(1).max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: parsed.data,
    include: {
      connectedAccount: { select: { email: true, name: true } },
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { reports: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project._count.reports > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить проект с отчётами" },
      { status: 409 }
    );
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
