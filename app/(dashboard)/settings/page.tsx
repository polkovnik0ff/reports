"use client";

import { useEffect, useState } from "react";
import { Settings, KeyRound, CheckCircle2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  // ── Profile ────────────────────────────────────────────────────────────────
  const [email, setEmail]           = useState("");
  const [name, setName]             = useState("");
  const [nameLoading, setNameLoading] = useState(true);
  const [nameSaving, setNameSaving] = useState(false);

  // ── Password ───────────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving]   = useState(false);

  // ── Topvisor ───────────────────────────────────────────────────────────────
  const [userId, setUserId]     = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [hasKeys, setHasKeys]   = useState(false);
  const [tvLoading, setTvLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((d) => { setEmail(d.email ?? ""); setName(d.name ?? ""); })
      .catch(() => {})
      .finally(() => setNameLoading(false));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setHasKeys(!!d.hasTopvisorCredentials))
      .catch(() => {})
      .finally(() => setTvLoading(false));
  }, []);

  async function handleSaveName() {
    if (!name.trim()) { toast.error("Имя не может быть пустым"); return; }
    setNameSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Имя сохранено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleSavePassword() {
    if (!currentPwd) { toast.error("Введите текущий пароль"); return; }
    if (newPwd.length < 8) { toast.error("Новый пароль — минимум 8 символов"); return; }
    if (newPwd !== confirmPwd) { toast.error("Пароли не совпадают"); return; }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Пароль изменён");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleSaveTopvisor() {
    if (!userId.trim() || !apiKey.trim()) { toast.error("Заполните оба поля"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topvisorUserId: userId.trim(), topvisorApiKey: apiKey.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ключи сохранены");
      setHasKeys(true); setUserId(""); setApiKey("");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearTopvisor() {
    if (!confirm("Удалить ключи Topvisor?")) return;
    const res = await fetch("/api/settings", { method: "DELETE" });
    if (res.ok) { setHasKeys(false); toast.success("Ключи удалены"); }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Настройки</h1>
      </div>

      {/* Profile */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Профиль</h2>
        </div>

        {nameLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div>
              <Button onClick={handleSaveName} disabled={nameSaving}>
                {nameSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Password */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Смена пароля</h2>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="current-pwd">Текущий пароль</Label>
            <Input
              id="current-pwd"
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-pwd">Новый пароль</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-pwd">Подтвердите пароль</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Button onClick={handleSavePassword} disabled={pwdSaving}>
              {pwdSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Изменить пароль
            </Button>
          </div>
        </div>
      </div>

      {/* Topvisor */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Topvisor API</h2>
          {!tvLoading && hasKeys && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ключи подключены
            </span>
          )}
        </div>

        {tvLoading ? (
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
              <Button onClick={handleSaveTopvisor} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {hasKeys ? "Обновить ключи" : "Сохранить ключи"}
              </Button>
              {hasKeys && (
                <Button variant="outline" onClick={handleClearTopvisor}>
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
