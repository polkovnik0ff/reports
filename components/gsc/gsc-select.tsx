"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Account {
  id: string;
  name: string | null;
  email: string;
}

interface Site {
  url: string;
}

export interface GscSettings {
  accountId: string | null;
  siteUrl: string | null;
}

interface Props {
  value: GscSettings;
  onChange: (v: GscSettings) => void;
}

export function GscSelect({ value, onChange }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gsc/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d.accounts) ? d.accounts : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    if (!value.accountId) {
      setSites([]);
      return;
    }
    setLoadingSites(true);
    setSitesError(null);
    fetch(`/api/gsc/sites?accountId=${value.accountId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setSitesError(d.error); return; }
        setSites(Array.isArray(d.sites) ? d.sites : []);
      })
      .catch(() => setSitesError("Ошибка загрузки сайтов"))
      .finally(() => setLoadingSites(false));
  }, [value.accountId]);

  function handleAccountChange(accountId: string) {
    onChange({ accountId: accountId || null, siteUrl: null });
  }

  function handleSiteChange(siteUrl: string) {
    onChange({ ...value, siteUrl: siteUrl || null });
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
        Нет подключённых аккаунтов Google Search Console.{" "}
        <a href="/sources" className="text-primary hover:underline">Подключить</a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Аккаунт Google</Label>
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

      {value.accountId && (
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Сайт в GSC</Label>
          {loadingSites ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Загрузка сайтов…
            </div>
          ) : sitesError ? (
            <p className="text-xs text-destructive">{sitesError}</p>
          ) : sites.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нет верифицированных сайтов</p>
          ) : (
            <select
              value={value.siteUrl ?? ""}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="w-full h-8 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— не выбран —</option>
              {sites.map((s) => (
                <option key={s.url} value={s.url}>{s.url}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
