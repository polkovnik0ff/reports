"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Account {
  id: string;
  name: string | null;
  email: string;
}

interface Host {
  id: string;
  url: string;
}

export interface WebmasterSettings {
  accountId: string | null;
  hostId: string | null;
}

interface Props {
  value: WebmasterSettings;
  onChange: (v: WebmasterSettings) => void;
}

export function WebmasterSelect({ value, onChange }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [hostsError, setHostsError] = useState<string | null>(null);

  // Load accounts once
  useEffect(() => {
    fetch("/api/webmaster/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d.accounts) ? d.accounts : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, []);

  // Load hosts when account changes
  useEffect(() => {
    if (!value.accountId) {
      setHosts([]);
      return;
    }
    setLoadingHosts(true);
    setHostsError(null);
    fetch(`/api/webmaster/hosts?accountId=${value.accountId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setHostsError(d.error); return; }
        setHosts(Array.isArray(d.hosts) ? d.hosts : []);
      })
      .catch(() => setHostsError("Ошибка загрузки сайтов"))
      .finally(() => setLoadingHosts(false));
  }, [value.accountId]);

  function handleAccountChange(accountId: string) {
    onChange({ accountId: accountId || null, hostId: null });
  }

  function handleHostChange(hostId: string) {
    onChange({ ...value, hostId: hostId || null });
  }

  if (loadingAccounts) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Загрузка аккаунтов…
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Нет подключённых аккаунтов Яндекс Вебмастера.{" "}
        <a href="/sources" className="text-primary hover:underline">Подключить</a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Account select */}
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Аккаунт Вебмастера</Label>
        <select
          value={value.accountId ?? ""}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— не выбран —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ? `${a.name} (${a.email})` : a.email}
            </option>
          ))}
        </select>
      </div>

      {/* Host select */}
      {value.accountId && (
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Сайт</Label>
          {loadingHosts ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Загрузка сайтов…
            </div>
          ) : hostsError ? (
            <p className="text-xs text-destructive">{hostsError}</p>
          ) : hosts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет верифицированных сайтов</p>
          ) : (
            <select
              value={value.hostId ?? ""}
              onChange={(e) => handleHostChange(e.target.value)}
              className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— не выбран —</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>{h.url}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
