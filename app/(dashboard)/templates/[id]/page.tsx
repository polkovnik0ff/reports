import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import TemplateEditor from "@/components/templates/template-editor";
import { BlockConfig } from "@/lib/blocks/defaults";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  return (
    <TemplateEditor
      templateId={template.id}
      initialName={template.name}
      initialBlocks={template.blocksConfig as unknown as BlockConfig[]}
    />
  );
}
