import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";

type YandexService = "YANDEX_METRIKA" | "YANDEX_WEBMASTER";

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

  if (!stateCookieRaw || !stateParam || !code) {
    return redirectError(origin, "invalid_state");
  }

  let stateCookie: { state: string; service: YandexService };
  try {
    stateCookie = JSON.parse(stateCookieRaw);
  } catch {
    return redirectError(origin, "invalid_state");
  }

  if (stateCookie.state !== stateParam) {
    return redirectError(origin, "invalid_state");
  }

  const service = stateCookie.service;

  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    return redirectError(origin, "config_error");
  }

  // Exchange authorization code for access token
  let tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  try {
    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/oauth/yandex/callback`,
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

  // Fetch Yandex user profile
  let email: string;
  let name: string | null;

  try {
    const userRes = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      return redirectError(origin, "user_info_error");
    }

    const userInfo = await userRes.json();
    email = userInfo.default_email ?? userInfo.login;
    name = userInfo.real_name ?? userInfo.display_name ?? userInfo.login ?? null;
  } catch {
    return redirectError(origin, "user_info_error");
  }

  // Encrypt tokens before storing
  const encryptedAccess = encryptToken(access_token);
  const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : null;
  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : null;

  try {
    await prisma.connectedAccount.upsert({
      where: { email_service: { email, service } },
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
        service,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt,
        status: "CONNECTED",
      },
    });
  } catch {
    return redirectError(origin, "db_error");
  }

  const res = NextResponse.redirect(new URL("/sources?success=true", origin));
  res.cookies.delete("oauth_state");
  return res;
}
