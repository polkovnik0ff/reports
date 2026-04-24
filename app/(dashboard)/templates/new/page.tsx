import TemplateEditor from "@/components/templates/template-editor";
import { DEFAULT_BLOCKS } from "@/lib/blocks/defaults";

export default function NewTemplatePage() {
  return <TemplateEditor initialBlocks={DEFAULT_BLOCKS} />;
}
