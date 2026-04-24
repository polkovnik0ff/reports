import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      connectedAccount: { select: { email: true, name: true } },
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json(projects);
}

const createSchema = z.object({
  metrikaCounterId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
  connectedAccountId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  const { metrikaCounterId, name, url, connectedAccountId } = parsed.data;

  const account = await prisma.connectedAccount.findFirst({
    where: { id: connectedAccountId, service: "YANDEX_METRIKA" },
  });
  if (!account) {
    return NextResponse.json({ error: "Аккаунт не найден" }, { status: 404 });
  }

  const existing = await prisma.project.findUnique({
    where: { metrikaCounterId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Счётчик уже добавлен как проект" },
      { status: 409 }
    );
  }

  const project = await prisma.project.create({
    data: { metrikaCounterId, name, url, connectedAccountId },
    include: {
      connectedAccount: { select: { email: true, name: true } },
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
