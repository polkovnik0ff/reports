import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BlockConfig } from "@/lib/blocks/defaults";
import ReportEditor from "@/components/reports/report-editor";

interface Props {
  params: Promise<{ id: string; reportId: string }>;
}

export default async function EditReportPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { id, reportId } = await params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      dateFrom: true,
      dateTo: true,
      compareFrom: true,
      compareTo: true,
      attribution: true,
      withRobots: true,
      crossDevice: true,
      topvisorProjectId:  true,
      webmasterAccountId: true,
      webmasterHostId:    true,
      reportConfig: true,
      project: { select: { id: true, name: true, url: true } },
    },
  });

  if (!report || report.project.id !== id) notFound();

  function fmt(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return (
    <ReportEditor
      reportId={report.id}
      slug={report.slug}
      projectId={id}
      projectName={report.project.name}
      projectUrl={report.project.url}
      initialTitle={report.title}
      initialDateFrom={fmt(report.dateFrom)}
      initialDateTo={fmt(report.dateTo)}
      initialCompareFrom={report.compareFrom ? fmt(report.compareFrom) : ""}
      initialCompareTo={report.compareTo ? fmt(report.compareTo) : ""}
      initialAttribution={report.attribution as "lastsign" | "first" | "last" | "auto" | "direct"}
      initialWithRobots={report.withRobots}
      initialCrossDevice={report.crossDevice}
      initialTopvisorProjectId={report.topvisorProjectId}
      initialWebmasterAccountId={report.webmasterAccountId}
      initialWebmasterHostId={report.webmasterHostId}
      initialBlocks={report.reportConfig as unknown as BlockConfig[]}
    />
  );
}
