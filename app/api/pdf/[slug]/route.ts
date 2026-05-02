import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdf } from "@/lib/pdf";

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

  const buffer = await generatePdf(slug);
  const title = report.title.trim() || slug;
  // RFC 5987: filename* with percent-encoded UTF-8, no quotes
  const encoded = encodeURIComponent(title).replace(/'/g, "%27");
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}.pdf`,
    },
  });
}
