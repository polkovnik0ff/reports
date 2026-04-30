import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { TopvisorClient } from "@/lib/services/topvisor";
import { getTopvisorCredentials } from "@/lib/topvisor-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creds = await getTopvisorCredentials();
  if (!creds) {
    return NextResponse.json({ error: "Topvisor credentials not configured" }, { status: 422 });
  }

  try {
    const client = new TopvisorClient(creds.userId, creds.apiKey);
    const projects = await client.getProjects();
    return NextResponse.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка Topvisor API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
