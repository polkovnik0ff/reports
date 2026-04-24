import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.connectedAccount.findMany({
    orderBy: { connectedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      service: true,
      status: true,
      connectedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(accounts);
}
