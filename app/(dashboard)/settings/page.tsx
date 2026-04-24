import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Настройки</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <p className="text-muted-foreground">Настройки появятся в следующей фазе.</p>
      </div>
    </div>
  );
}
