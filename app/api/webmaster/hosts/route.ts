import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { WebmasterClient } from "@/lib/services/webmaster";

// Returns list of verified hosts for a given webmaster account
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, service: "YANDEX_WEBMASTER", status: "CONNECTED" },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const token = decryptToken(account.accessToken);
    const client = new WebmasterClient(token);
    const hosts = await client.getHosts();
    // Return only verified hosts, sorted by URL
    const verified = hosts
      .filter((h) => h.verified)
      .sort((a, b) => a.unicode_host_url.localeCompare(b.unicode_host_url))
      .map((h) => ({ id: h.host_id, url: h.unicode_host_url }));
    return NextResponse.json({ hosts: verified });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка Webmaster API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
