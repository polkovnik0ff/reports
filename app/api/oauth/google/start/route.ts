import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Google OAuth не настроен" }, { status: 500 });
  }

  const stateNonce = nanoid(32);
  const cookiePayload = JSON.stringify({ state: stateNonce, service: "GOOGLE_SEARCH_CONSOLE" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${appUrl}/api/oauth/google/callback`,
    scope: "openid email https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
    state: stateNonce,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set("oauth_state", cookiePayload, {
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
