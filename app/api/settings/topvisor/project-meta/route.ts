import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { TopvisorClient } from "@/lib/services/topvisor";
import { getTopvisorCredentials } from "@/lib/topvisor-settings";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = Number(req.nextUrl.searchParams.get("projectId"));
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const creds = await getTopvisorCredentials();
  if (!creds) return NextResponse.json({ error: "Topvisor credentials not configured" }, { status: 422 });

  try {
    const client = new TopvisorClient(creds.userId, creds.apiKey);
    const [{ dates: existsDates, regionIndex }, groups] = await Promise.all([
      client.getExistsDates(projectId),
      client.getGroups(projectId),
    ]);
    return NextResponse.json({ existsDates, regionIndex, groups });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка Topvisor API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
