import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { BlockConfig, BLOCK_LABELS, BlockType } from "@/lib/blocks/defaults";
import { ReportRenderer } from "@/components/report/report-renderer";
import { ReportHeader } from "@/components/report/report-header";
import { ReportNav } from "@/components/report/report-nav";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const report = await prisma.report.findUnique({ where: { slug } });
  if (!report) return { title: "Отчёт не найден" };

  const from = new Date(report.dateFrom).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const to = new Date(report.dateTo).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  return {
    title: report.title,
    description: `SEO-отчёт за период ${from} — ${to}`,
  };
}

export default async function PublicReportPage({ params }: Props) {
  const { slug } = await params;

  const report = await prisma.report.findUnique({
    where: { slug },
    include: { project: true },
  });

  if (!report) notFound();

  if (report.status === "GENERATING") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Отчёт генерируется…</p>
        </div>
      </div>
    );
  }

  if (report.status === "ERROR") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-2xl mb-2">⚠️</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ошибка генерации</h1>
          <p className="text-gray-500 text-sm">При создании отчёта произошла ошибка. Попробуйте создать новый отчёт.</p>
        </div>
      </div>
    );
  }

  const reportConfig = report.reportConfig as unknown as BlockConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshotData = (report.snapshotData ?? {}) as Record<string, any>;

  const navItems = reportConfig
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order)
    .map((b) => ({
      id: `block-${b.id}`,
      label: b.label || (BLOCK_LABELS[b.type as BlockType] ?? b.type),
    }));

  return (
    <div className="report-page">
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr" }}>
        <Suspense>
          <ReportNav items={navItems} slug={slug} title={report.title} />
        </Suspense>
        <main style={{ padding: "32px 56px 120px", minWidth: 0 }}>
          <Suspense>
            <ReportHeader
              title={report.title}
              dateFrom={report.dateFrom}
              dateTo={report.dateTo}
              compareFrom={report.compareFrom}
              compareTo={report.compareTo}
              generatedAt={report.generatedAt}
            />
          </Suspense>
          <ReportRenderer reportConfig={reportConfig} snapshotData={snapshotData} />
        </main>
      </div>
    </div>
  );
}
