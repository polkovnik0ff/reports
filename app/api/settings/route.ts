import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.accountSettings.findFirst();

  return NextResponse.json({
    topvisorUserId:   settings?.topvisorUserId  ? "set" : null,
    topvisorApiKey:   settings?.topvisorApiKey  ? "set" : null,
    whiteLabelDomain: settings?.whiteLabelDomain ?? null,
    hasTopvisorCredentials: !!(settings?.topvisorUserId && settings?.topvisorApiKey),
  });
}

const patchSchema = z.object({
  topvisorUserId:   z.string().min(1).max(100).optional(),
  topvisorApiKey:   z.string().min(1).max(200).optional(),
  whiteLabelDomain: z.string().max(200).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Неверные данные" }, { status: 400 });

  const { topvisorUserId, topvisorApiKey, whiteLabelDomain } = parsed.data;

  const existing = await prisma.accountSettings.findFirst();

  const data: Record<string, unknown> = {};

  if (topvisorUserId !== undefined) data.topvisorUserId = encryptToken(topvisorUserId);
  if (topvisorApiKey !== undefined) data.topvisorApiKey = encryptToken(topvisorApiKey);
  if (whiteLabelDomain !== undefined) data.whiteLabelDomain = whiteLabelDomain;

  if (existing) {
    await prisma.accountSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.accountSettings.create({ data: data as Parameters<typeof prisma.accountSettings.create>[0]["data"] });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.accountSettings.findFirst();
  if (!existing) return NextResponse.json({ ok: true });

  await prisma.accountSettings.update({
    where: { id: existing.id },
    data: { topvisorUserId: null, topvisorApiKey: null },
  });

  return NextResponse.json({ ok: true });
}

