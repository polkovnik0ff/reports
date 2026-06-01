import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

function redirectError(baseUrl: string, error: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/sources?error=${error}`, baseUrl));
  res.cookies.delete("oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  const stateCookieRaw = req.cookies.get("oauth_state")?.value;

  const appUrlEarly = process.env.APP_URL ?? origin;

  if (!stateCookieRaw || !stateParam || !code) {
    return redirectError(appUrlEarly, "invalid_state");
  }

  let stateCookie: { state: string; service: string };
  try {
    stateCookie = JSON.parse(stateCookieRaw);
  } catch {
    return redirectError(appUrlEarly, "invalid_state");
  }

  if (stateCookie.state !== stateParam) {
    return redirectError(appUrlEarly, "invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? origin;

  if (!clientId || !clientSecret) {
    return redirectError(appUrl, "config_error");
  }

  // Exchange code for tokens
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/oauth/google/callback`,
      }),
    });

    tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      return redirectError(origin, "token_error");
    }
  } catch {
    return redirectError(origin, "token_error");
  }

  const { access_token, refresh_token, expires_in } = tokenData;
  if (!access_token) return redirectError(origin, "token_error");

  // Fetch Google user profile
  let email: string;
  let name: string | null;

  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) return redirectError(origin, "user_info_error");

    const userInfo = await userRes.json();
    email = userInfo.email;
    name = userInfo.name ?? null;
  } catch {
    return redirectError(origin, "user_info_error");
  }

  const encryptedAccess = encryptToken(access_token);
  const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : null;
  const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

  try {
    await prisma.connectedAccount.upsert({
      where: { email_service: { email, service: "GOOGLE_SEARCH_CONSOLE" } },
      update: {
        name,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt,
        status: "CONNECTED",
      },
      create: {
        name,
        email,
        service: "GOOGLE_SEARCH_CONSOLE",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt,
        status: "CONNECTED",
      },
    });
  } catch {
    return redirectError(appUrl, "db_error");
  }

  const res = NextResponse.redirect(new URL("/sources?success=true", appUrl));
  res.cookies.delete("oauth_state");
  return res;
}
