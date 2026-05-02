import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100).optional(),
}).refine(
  (d) => !(d.newPassword && !d.currentPassword),
  { message: "Укажите текущий пароль", path: ["currentPassword"] },
);

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword!, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
    }
  }

  const data: { name?: string; passwordHash?: string } = {};
  if (name !== undefined) data.name = name;
  if (newPassword) data.passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({ where: { id: session.userId }, data });

  return NextResponse.json({ ok: true });
}
