import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { GscClient } from "@/lib/services/gsc";
import { encryptToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, service: "GOOGLE_SEARCH_CONSOLE", status: "CONNECTED" },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth не настроен" }, { status: 500 });
  }

  try {
    const token = decryptToken(account.accessToken);
    const refreshToken = account.refreshToken ? decryptToken(account.refreshToken) : null;

    const client = new GscClient(token, refreshToken, clientId, clientSecret, async (newToken, expiresAt) => {
      await prisma.connectedAccount.update({
        where: { id: accountId },
        data: { accessToken: encryptToken(newToken), expiresAt },
      });
    });

    const sites = await client.getSites();
    const sorted = sites
      .filter((s) => ["siteOwner", "siteFullUser", "siteRestrictedUser"].includes(s.permissionLevel))
      .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl))
      .map((s) => ({ url: s.siteUrl }));

    return NextResponse.json({ sites: sorted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка GSC API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
