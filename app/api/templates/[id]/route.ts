import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(template);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  blocksConfig: z.array(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const { name, blocksConfig, isDefault } = parsed.data;

  if (isDefault) {
    await prisma.template.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (blocksConfig !== undefined) updateData.blocksConfig = blocksConfig;
  if (isDefault !== undefined) updateData.isDefault = isDefault;

  const template = await prisma.template.update({ where: { id }, data: updateData });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: { _count: { select: { reports: true } } },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (template._count.reports > 0) {
    return NextResponse.json({ error: "Нельзя удалить шаблон с отчётами" }, { status: 409 });
  }

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
