"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

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

  useEffect(() => {
    fetch("/api/webmaster/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d.accounts) ? d.accounts : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, []);

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

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name ?? a.email,
    sublabel: a.name ? a.email : undefined,
  }));

  const hostOptions = hosts.map((h) => ({
    value: h.id,
    label: h.url,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Аккаунт Вебмастера</Label>
        <SearchableSelect
          options={accountOptions}
          value={value.accountId ?? ""}
          onChange={handleAccountChange}
          placeholder="— не выбран —"
          searchPlaceholder="Поиск по email..."
          emptyText="Аккаунты не найдены"
        />
      </div>

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
            <SearchableSelect
              options={hostOptions}
              value={value.hostId ?? ""}
              onChange={handleHostChange}
              placeholder="— не выбран —"
              searchPlaceholder="Поиск по URL..."
              emptyText="Сайты не найдены"
            />
          )}
        </div>
      )}
    </div>
  );
}
