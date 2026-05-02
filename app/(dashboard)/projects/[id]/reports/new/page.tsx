import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReportFormEmbedded from "@/components/reports/report-form-embedded";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewReportPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true, name: true, url: true,
      defaultTopvisorProjectId: true,
      defaultWebmasterAccountId: true,
      defaultWebmasterHostId: true,
      defaultGscAccountId: true,
      defaultGscSiteUrl: true,
    },
  });

  if (!project) notFound();

  return (
    <ReportFormEmbedded
      projectId={project.id}
      projectName={project.name}
      projectUrl={project.url}
      defaultTopvisorProjectId={project.defaultTopvisorProjectId ?? undefined}
      defaultWebmasterAccountId={project.defaultWebmasterAccountId ?? undefined}
      defaultWebmasterHostId={project.defaultWebmasterHostId ?? undefined}
      defaultGscAccountId={project.defaultGscAccountId ?? undefined}
      defaultGscSiteUrl={project.defaultGscSiteUrl ?? undefined}
    />
  );
}
