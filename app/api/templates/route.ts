import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.template.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const result = templates.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    createdAt: t.createdAt,
    blockCount: Array.isArray(t.blocksConfig) ? (t.blocksConfig as unknown[]).length : 0,
  }));

  return NextResponse.json(result);
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  blocksConfig: z.array(z.any()),
  isDefault: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const { name, blocksConfig, isDefault } = parsed.data;

  if (isDefault) {
    await prisma.template.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const template = await prisma.template.create({ data: { name, blocksConfig: blocksConfig as any, isDefault } });
  return NextResponse.json(template, { status: 201 });
}
