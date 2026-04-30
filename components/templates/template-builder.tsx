"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { BlockConfig, BLOCK_LABELS, BlockType } from "@/lib/blocks/defaults";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TopvisorScanSettings } from "@/components/topvisor/topvisor-scan-settings";
import { cn } from "@/lib/utils";

// ── Toggle switch ──────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        enabled ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ── Single sortable block row ──────────────────────────────────────────────

function SortableBlock({
  block,
  onToggle,
  onCommentChange,
  onSettingsChange,
  topvisorProjectId,
}: {
  block: BlockConfig;
  onToggle: (id: string, enabled: boolean) => void;
  onCommentChange: (id: string, field: "commentAbove" | "commentBelow", value: string) => void;
  onSettingsChange?: (id: string, settings: Record<string, unknown>) => void;
  topvisorProjectId?: number | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = BLOCK_LABELS[block.type as BlockType] ?? block.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-background transition-shadow",
        isDragging ? "shadow-lg opacity-80 z-50" : "shadow-sm",
        !block.enabled && "opacity-60"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none p-0.5 -ml-1"
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Label */}
        <span className={cn("flex-1 text-sm font-medium", !block.enabled && "text-muted-foreground")}>
          {label}
        </span>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label={expanded ? "Свернуть" : "Развернуть"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Toggle */}
        <Toggle enabled={block.enabled} onChange={(v) => onToggle(block.id, v)} />
      </div>

      {/* Expanded: settings + comment fields */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 flex flex-col gap-3 border-t bg-muted/20">
          {/* Positions block settings */}
          {(block.type === "positions_summary" || block.type === "positions_table") &&
            onSettingsChange && (
              <div className="pt-3 border-b pb-3">
                <p className="text-xs text-muted-foreground font-medium mb-2">Настройки позиций</p>
                <TopvisorScanSettings
                  topvisorProjectId={topvisorProjectId ?? null}
                  value={{
                    scanDate: block.settings?.scanDate as string | undefined,
                    compareScanDate: block.settings?.compareScanDate as string | undefined,
                    groupIds: block.settings?.groupIds as number[] | undefined,
                  }}
                  onChange={(v) =>
                    onSettingsChange(block.id, { ...block.settings, ...v })
                  }
                />
              </div>
            )}
          <div className="flex flex-col gap-1 pt-1">
            <label className="text-xs text-muted-foreground font-medium">
              Комментарий над блоком
            </label>
            <RichTextEditor
              content={block.commentAbove}
              onChange={(value) => onCommentChange(block.id, "commentAbove", value)}
              placeholder="Комментарий над блоком..."
              minHeight="100px"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">
              Комментарий под блоком
            </label>
            <RichTextEditor
              content={block.commentBelow}
              onChange={(value) => onCommentChange(block.id, "commentBelow", value)}
              placeholder="Комментарий под блоком..."
              minHeight="100px"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Template builder ───────────────────────────────────────────────────────

interface TemplateBuilderProps {
  blocks: BlockConfig[];
  onChange: (blocks: BlockConfig[]) => void;
  topvisorProjectId?: number | null;
}

export default function TemplateBuilder({ blocks, onChange, topvisorProjectId }: TemplateBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      order: i + 1,
    }));
    onChange(reordered);
  }

  function handleToggle(id: string, enabled: boolean) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, enabled } : b)));
  }

  function handleCommentChange(
    id: string,
    field: "commentAbove" | "commentBelow",
    value: string
  ) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }

  function handleSettingsChange(id: string, settings: Record<string, unknown>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, settings } : b)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onToggle={handleToggle}
              onCommentChange={handleCommentChange}
              onSettingsChange={handleSettingsChange}
              topvisorProjectId={topvisorProjectId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
