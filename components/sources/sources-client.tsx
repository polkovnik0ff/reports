"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, Loader2, Database, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ConnectedService =
  | "YANDEX_METRIKA"
  | "YANDEX_WEBMASTER"
  | "YANDEX_DIRECT"
  | "GOOGLE_ANALYTICS"
  | "GOOGLE_ADS"
  | "GOOGLE_SEARCH_CONSOLE"
  | "VK_ADS"
  | "FACEBOOK"
  | "BITRIX24";

type AccountStatus = "CONNECTED" | "NO_ACCESS" | "DISCONNECTED";

interface Account {
  id: string;
  name: string | null;
  email: string;
  service: ConnectedService;
  status: AccountStatus;
  connectedAt: string;
  expiresAt: string | null;
}

const SERVICE_LABELS: Record<ConnectedService, string> = {
  YANDEX_METRIKA: "Яндекс.Метрика",
  YANDEX_WEBMASTER: "Яндекс.Вебмастер",
  YANDEX_DIRECT: "Яндекс.Директ",
  GOOGLE_ANALYTICS: "Google Analytics",
  GOOGLE_ADS: "Google Ads",
  GOOGLE_SEARCH_CONSOLE: "Google Search Console",
  VK_ADS: "VK Реклама",
  FACEBOOK: "Facebook",
  BITRIX24: "Битрикс24",
};

function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === "CONNECTED") {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
        Подключён
      </Badge>
    );
  }
  if (status === "NO_ACCESS") {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
        Нет доступа
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200">
      Отключён
    </Badge>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  success?: boolean;
  error?: string;
}

export default function SourcesClient({ success, error }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (success) toast.success("Аккаунт успешно подключён");
    if (error === "invalid_state") toast.error("Ошибка авторизации. Попробуйте ещё раз.");
    if (error === "token_error") toast.error("Не удалось получить токен. Попробуйте ещё раз.");
    if (error === "user_info_error") toast.error("Не удалось получить данные аккаунта.");
    if (error === "db_error") toast.error("Ошибка сохранения. Попробуйте ещё раз.");
    if (error === "config_error") toast.error("OAuth не настроен на сервере.");
  }, [success, error]);

  async function handleDelete(id: string, name: string | null, email: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast.success(`Аккаунт ${name ?? email} отключён`);
      } else {
        toast.error("Не удалось отключить аккаунт");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Источники данных</h1>
        <p className="text-sm text-muted-foreground">
          Подключите аккаунты для получения данных в отчётах.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <a
          href="/api/oauth/yandex/start"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          + Яндекс.Метрика
        </a>
        <a
          href="/api/oauth/yandex-webmaster/start"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          + Яндекс.Вебмастер
        </a>
        <a
          href="/api/oauth/google/start"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          + Google Search Console
        </a>
        {accounts.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAccounts}
            disabled={loading}
            title="Обновить"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      <Separator className="mb-6" />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Database className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Нет подключённых аккаунтов</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Аккаунт</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Сервис</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Подключён</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{account.name ?? account.email}</div>
                    {account.name && (
                      <div className="text-xs text-muted-foreground">{account.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {SERVICE_LABELS[account.service] ?? account.service}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(account.connectedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === account.id}
                      onClick={() => handleDelete(account.id, account.name, account.email)}
                      title="Отключить"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
