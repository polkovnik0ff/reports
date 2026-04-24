import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function GET() {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const appUrl = process.env.APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "OAuth не настроен" }, { status: 500 });
  }

  const stateNonce = nanoid(32);
  const cookiePayload = JSON.stringify({ state: stateNonce, service: "YANDEX_METRIKA" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${appUrl}/api/oauth/yandex/callback`,
    scope: "metrika:read",
    state: stateNonce,
    force_confirm: "yes",
  });

  const response = NextResponse.redirect(
    `https://oauth.yandex.ru/authorize?${params.toString()}`
  );

  response.cookies.set("oauth_state", cookiePayload, {
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
