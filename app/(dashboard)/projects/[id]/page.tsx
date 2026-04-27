import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProjectPageClient from "@/components/projects/project-page-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      metrikaCounterId: true,
    },
  });

  if (!project) notFound();

  return (
    <ProjectPageClient
      projectId={project.id}
      projectName={project.name}
      projectUrl={project.url}
      counterIdStr={String(project.metrikaCounterId)}
    />
  );
}
