import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const PDFS_DIR = path.join(process.cwd(), "public", "pdfs");

export async function generatePdf(slug: string): Promise<string> {
  if (!fs.existsSync(PDFS_DIR)) {
    fs.mkdirSync(PDFS_DIR, { recursive: true });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/r/${slug}?print=1`;
  const outputPath = path.join(PDFS_DIR, `${slug}.pdf`);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
  } finally {
    await browser.close();
  }

  return `/pdfs/${slug}.pdf`;
}
