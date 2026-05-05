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

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name ?? a.email,
    sublabel: a.name ? a.email : undefined,
  }));

  const siteOptions = sites.map((s) => ({
    value: s.url,
    label: s.url,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Аккаунт Google</Label>
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
            <SearchableSelect
              options={siteOptions}
              value={value.siteUrl ?? ""}
              onChange={handleSiteChange}
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
