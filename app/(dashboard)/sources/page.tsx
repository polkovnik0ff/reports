import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SourcesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Источники данных</h1>
        <p className="text-muted-foreground text-sm">
          Подключите аккаунты для получения данных в отчётах.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Button variant="outline">+ Яндекс.Метрика</Button>
        <Button variant="outline">+ Яндекс.Вебмастер</Button>
      </div>

      <Separator className="mb-8" />

      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Database className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Нет подключённых аккаунтов</p>
      </div>
    </div>
  );
}
