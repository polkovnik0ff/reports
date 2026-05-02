import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const report = await prisma.report.findUnique({ where: { slug } });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (report.status !== "READY") {
    return NextResponse.json({ error: "Report not ready" }, { status: 400 });
  }

  // Serve cached PDF if it exists
  if (report.pdfPath) {
    const abs = path.join(process.cwd(), "public", report.pdfPath);
    if (fs.existsSync(abs)) {
      const buffer = fs.readFileSync(abs);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug}.pdf"`,
        },
      });
    }
  }

  // Generate
  const pdfPath = await generatePdf(slug);

  await prisma.report.update({
    where: { slug },
    data: { pdfPath },
  });

  const abs = path.join(process.cwd(), "public", pdfPath);
  const buffer = fs.readFileSync(abs);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
    },
  });
}
