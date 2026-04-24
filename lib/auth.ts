import { SignJWT } from "jose";
import { cookies } from "next/headers";

// Re-export edge-safe types and verifyToken so callers can use @/lib/auth for everything
export type { SessionPayload } from "./auth-edge";
export { verifyToken } from "./auth-edge";

const COOKIE_NAME = "session";
const TOKEN_TTL = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createToken(payload: import("./auth-edge").SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function getSession(): Promise<import("./auth-edge").SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const { verifyToken } = await import("./auth-edge");
  return verifyToken(token);
}

export function sessionCookieOptions(isProduction: boolean) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  };
}
