import { chromium } from "playwright";

export async function generatePdf(slug: string): Promise<Buffer> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/r/${slug}?print=1`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Large viewport so charts render at full width
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle" });
    // Wait for Recharts SVG elements to appear
    await page.waitForSelector(".recharts-wrapper", { timeout: 15000 }).catch(() => {});
    // Extra buffer for animations/rendering to finish
    await page.waitForTimeout(1500);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
  } finally {
    await browser.close();
  }
}
