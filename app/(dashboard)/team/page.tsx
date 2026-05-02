"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Loader2, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MEMBER";
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Владелец",
  MEMBER: "Участник",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={handle} className="ml-1 text-muted-foreground hover:text-foreground">
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function TeamPage() {
  const [members, setMembers]       = useState<Member[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  const [newEmail, setNewEmail]     = useState("");
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);
  const [createdPassword, setCreatedPassword] = useState<{ email: string; password: string } | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/team").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([teamData, meData]) => {
        setMembers(teamData);
        setCurrentUserId(meData.userId);
      })
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newEmail.trim()) { toast.error("Введите email"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() || undefined, role: "MEMBER" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMembers((prev) => [...prev, d]);
      setCreatedPassword({ email: d.email, password: d.password });
      setNewEmail(""); setNewName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id: string, role: "OWNER" | "MEMBER") {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMembers((prev) => prev.map((m) => (m.id === id ? d : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Удалить пользователя ${email}?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Пользователь удалён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Users className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Команда</h1>
      </div>

      {/* Add member */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Добавить участника</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@agency.ru"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-name">Имя (необязательно)</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Иван Иванов"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Создать аккаунт
        </Button>

        {/* One-time password display */}
        {createdPassword && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm space-y-1">
            <p className="font-medium text-green-800">Аккаунт создан. Сохраните пароль — он больше не будет показан.</p>
            <p className="text-green-700">
              Email: <span className="font-mono">{createdPassword.email}</span>
            </p>
            <p className="text-green-700 flex items-center">
              Пароль: <span className="font-mono ml-1">{createdPassword.password}</span>
              <CopyButton text={createdPassword.password} />
            </p>
            <button
              type="button"
              onClick={() => setCreatedPassword(null)}
              className="text-xs text-green-600 underline mt-1"
            >
              Скрыть
            </button>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Участники</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Пользователь</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Роль</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Добавлен</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isMe = m.id === currentUserId;
                return (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-3">
                      <p className="font-medium">{m.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isMe ? (
                        <span className="text-muted-foreground">{ROLE_LABELS[m.role]}</span>
                      ) : (
                        <select
                          value={m.role}
                          disabled={!!updatingId}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as "OWNER" | "MEMBER")}
                          className="border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="OWNER">Владелец</option>
                          <option value="MEMBER">Участник</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isMe && (
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id, m.email)}
                          disabled={deletingId === m.id}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                          title="Удалить"
                        >
                          {deletingId === m.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
