"use client";

import { useEffect, useState } from "react";
import { Settings, KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [userId, setUserId]     = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [hasKeys, setHasKeys]   = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setHasKeys(!!d.hasTopvisorCredentials))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!userId.trim() || !apiKey.trim()) {
      toast.error("Заполните оба поля");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topvisorUserId: userId.trim(), topvisorApiKey: apiKey.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ключи сохранены");
      setHasKeys(true);
      setUserId("");
      setApiKey("");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!confirm("Удалить ключи Topvisor?")) return;
    const res = await fetch("/api/settings", { method: "DELETE" });
    if (res.ok) {
      setHasKeys(false);
      toast.success("Ключи удалены");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Настройки</h1>
      </div>

      {/* Topvisor */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Topvisor API</h2>
          {!loading && hasKeys && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ключи подключены
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Используется для блоков позиций. Один аккаунт на всё агентство.{" "}
              <a
                href="https://topvisor.com/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Где взять ключи?
              </a>
            </p>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="tv-userid">User ID</Label>
                <Input
                  id="tv-userid"
                  placeholder={hasKeys ? "••••••••" : "12345"}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tv-apikey">API Key</Label>
                <Input
                  id="tv-apikey"
                  type="password"
                  placeholder={hasKeys ? "••••••••••••••••" : "Вставьте API-ключ"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {hasKeys ? "Обновить ключи" : "Сохранить ключи"}
              </Button>
              {hasKeys && (
                <Button variant="outline" onClick={handleClear}>
                  Удалить ключи
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
