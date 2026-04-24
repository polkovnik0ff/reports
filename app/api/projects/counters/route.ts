import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";

interface YandexCounter {
  id: number;
  name: string;
  site: string;
}

interface YandexCountersResponse {
  counters?: YandexCounter[];
  errors?: unknown;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { service: "YANDEX_METRIKA", status: "CONNECTED" },
    select: { id: true, email: true, accessToken: true },
  });

  const results: {
    counterId: number;
    counterName: string;
    counterSite: string;
    accountEmail: string;
    connectedAccountId: string;
  }[] = [];

  await Promise.allSettled(
    accounts.map(async (account) => {
      let token: string;
      try {
        token = decryptToken(account.accessToken);
      } catch {
        return;
      }

      let data: YandexCountersResponse;
      try {
        const res = await fetch(
          "https://api-metrika.yandex.net/management/v1/counters?per_page=200",
          { headers: { Authorization: `OAuth ${token}` }, cache: "no-store" }
        );
        if (!res.ok) return;
        data = await res.json();
      } catch {
        return;
      }

      for (const counter of data.counters ?? []) {
        results.push({
          counterId: counter.id,
          counterName: counter.name,
          counterSite: counter.site,
          accountEmail: account.email,
          connectedAccountId: account.id,
        });
      }
    })
  );

  return NextResponse.json(results);
}
