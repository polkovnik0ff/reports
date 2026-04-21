/**
 * Edge-runtime safe auth utilities (no Node.js-only APIs).
 * Used in proxy.ts which runs in the edge runtime.
 */

import { jwtVerify } from "jose";

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
