import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">История отчётов</h1>
        <Button>+ Создать отчёт</Button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Отчётов пока нет</p>
      </div>
    </div>
  );
}
