import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверный email или пароль" },
      { status: 401 }
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-time comparison even if user not found
  const dummyHash =
    "$2b$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ?? dummyHash
  );

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Неверный email или пароль" },
      { status: 401 }
    );
  }

  const token = await createToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = sessionCookieOptions(isProd);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...cookieOpts,
    value: token,
  });

  return response;
}
