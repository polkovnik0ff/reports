import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Мои проекты</h1>
        <Button>+ Добавить</Button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground max-w-sm">
          Проектов пока нет. Сначала подключите Яндекс.Метрику в разделе{" "}
          <a href="/sources" className="underline underline-offset-2 hover:text-foreground">
            Источники данных
          </a>
          .
        </p>
      </div>
    </div>
  );
}
