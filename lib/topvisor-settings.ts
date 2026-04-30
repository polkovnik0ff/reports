import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";

export async function getTopvisorCredentials(): Promise<{ userId: string; apiKey: string } | null> {
  const settings = await prisma.accountSettings.findFirst();
  if (!settings?.topvisorUserId || !settings?.topvisorApiKey) return null;

  try {
    return {
      userId: decryptToken(settings.topvisorUserId),
      apiKey: decryptToken(settings.topvisorApiKey),
    };
  } catch {
    return null;
  }
}
