"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TemplateBuilder from "./template-builder";
import { BlockConfig } from "@/lib/blocks/defaults";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemplateEditorProps {
  templateId?: string;
  initialName?: string;
  initialBlocks: BlockConfig[];
}

export default function TemplateEditor({
  templateId,
  initialName = "",
  initialBlocks,
}: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [blocks, setBlocks] = useState<BlockConfig[]>(initialBlocks);
  const [saving, setSaving] = useState(false);

  const isNew = !templateId;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Введите название шаблона");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/templates" : `/api/templates/${templateId}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), blocksConfig: blocks }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Ошибка при сохранении");
        return;
      }

      toast.success(isNew ? "Шаблон создан" : "Шаблон сохранён");
      router.push("/templates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          {isNew ? "Новый шаблон" : "Редактировать шаблон"}
        </h1>
        <div className="flex gap-2">
          <a
            href="/templates"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Отмена
          </a>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Сохранить
          </Button>
        </div>
      </div>

      {/* Name field */}
      <div className="grid gap-1.5 mb-6">
        <Label htmlFor="tpl-name">Название шаблона</Label>
        <Input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Стандартный отчёт"
        />
      </div>

      {/* Block builder */}
      <div className="mb-2">
        <p className="text-sm text-muted-foreground mb-3">
          Перетащите блоки для изменения порядка. Переключайте блоки, чтобы включить или выключить их в отчёте.
        </p>
        <TemplateBuilder blocks={blocks} onChange={setBlocks} />
      </div>
    </div>
  );
}
