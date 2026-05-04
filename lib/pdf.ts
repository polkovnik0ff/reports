import { chromium } from "playwright";

export async function generatePdf(slug: string): Promise<Buffer> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/r/${slug}?print=1`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // A4 at 96dpi = 794px wide; use 900 to give slight breathing room
    await page.setViewportSize({ width: 900, height: 1200 });
    await page.goto(url, { waitUntil: "networkidle" });
    // Wait for Recharts SVG elements to appear and animations to settle
    await page.waitForSelector(".recharts-wrapper", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
  } finally {
    await browser.close();
  }
}
