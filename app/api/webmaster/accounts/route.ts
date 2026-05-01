import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns all connected Yandex Webmaster accounts
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.connectedAccount.findMany({
    where: { service: "YANDEX_WEBMASTER", status: "CONNECTED" },
    select: { id: true, name: true, email: true },
    orderBy: { connectedAt: "asc" },
  });

  return NextResponse.json({ accounts });
}
