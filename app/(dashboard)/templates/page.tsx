import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TemplatesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Шаблоны отчётов</h1>
        <Button>+ Создать шаблон</Button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <LayoutTemplate className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Шаблонов пока нет</p>
      </div>
    </div>
  );
}
