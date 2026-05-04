"use client";

import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Color from "@tiptap/extension-color";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import FontFamily from "@tiptap/extension-font-family";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, ListTodo,
  Link as LinkIcon, RemoveFormatting, ImageIcon, TableIcon, Highlighter,
  Undo2, Redo2,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom FontSize extension built on top of TextStyle (no compatible npm package for v3)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FontSize = Extension.create<any>({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, unknown>) =>
            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
});

const FONT_FAMILIES = [
  { label: "Шрифт", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Verdana", value: "Verdana" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
];

const FONT_SIZES = [
  { label: "Размер", value: "" },
  { label: "10", value: "10px" },
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
  { label: "48", value: "48px" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

function ToolbarButton({
  onClick, active, title, disabled, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      title={title}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded text-sm transition-colors",
        disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-muted",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center" />;
}

const SELECT_CLASS = "text-xs text-muted-foreground bg-transparent rounded px-1 py-1 hover:bg-muted cursor-pointer outline-none border-0";

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Начните вводить текст...",
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const suppressNextUpdate = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      FontFamily,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" } }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      if (suppressNextUpdate.current) { suppressNextUpdate.current = false; return; }
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: { attributes: { class: "outline-none" } },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = content || "";
    const normalizedCurrent = current === "<p></p>" ? "" : current;
    if (normalizedCurrent === normalized) return;
    suppressNextUpdate.current = true;
    editor.commands.setContent(normalized || "");
  }, [content, editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) { alert("Допускаются только JPEG, PNG, WebP"); return; }
    if (file.size > 3 * 1024 * 1024) { alert("Файл больше 3 МБ"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Ошибка загрузки"); return; }
      editor.chain().focus().setImage({ src: data.url }).run();
    } finally { setUploading(false); }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
  }, [editor]);

  if (!editor) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs = editor.getAttributes("textStyle") as any;
  const currentColor: string = attrs.color || "#000000";
  const currentFontSize: string = attrs.fontSize || "";
  const currentFontFamily: string = attrs.fontFamily || "";

  return (
    <div className={cn("rounded-lg border bg-background overflow-hidden", className)}>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
      />
      <input ref={colorInputRef} type="color" className="hidden" value={currentColor}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b flex flex-wrap gap-0.5 px-2 py-1.5">

        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Отменить (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Повторить (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Font family */}
        <select value={currentFontFamily} title="Шрифт" className={cn(SELECT_CLASS, "max-w-[110px]")}
          onChange={(e) => e.target.value
            ? editor.chain().focus().setFontFamily(e.target.value).run()
            : editor.chain().focus().unsetFontFamily().run()
          }
        >
          {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Font size */}
        <select value={currentFontSize} title="Размер шрифта" className={cn(SELECT_CLASS, "w-[72px]")}
          onChange={(e) => {
            editor.chain().focus().setMark("textStyle", { fontSize: e.target.value || null }).run();
          }}
        >
          {FONT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <Separator />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Подчёркивание (Ctrl+U)">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Зачёркивание">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Выделить цветом">
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

        {/* Color picker */}
        <button type="button" title="Цвет текста"
          onMouseDown={(e) => { e.preventDefault(); colorInputRef.current?.click(); }}
          className="p-1.5 rounded text-sm transition-colors hover:bg-muted text-muted-foreground flex flex-col items-center justify-center gap-0"
        >
          <span className="text-xs font-bold leading-none">A</span>
          <span className="w-3.5 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: currentColor }} />
        </button>

        <Separator />

        {/* Superscript / Subscript */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Надстрочный">
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Подстрочный">
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Заголовок 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Заголовок 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="По левому краю">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="По центру">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="По правому краю">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Маркированный список">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Список задач">
          <ListTodo className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Link */}
        <ToolbarButton onClick={() => setShowLinkInput((v) => !v)} active={editor.isActive("link") || showLinkInput} title="Ссылка">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Image upload */}
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title={uploading ? "Загрузка..." : "Вставить изображение"} active={uploading}>
          <ImageIcon className={cn("h-4 w-4", uploading && "opacity-50")} />
        </ToolbarButton>

        {/* Table */}
        <ToolbarButton onClick={insertTable} active={editor.isActive("table")} title="Вставить таблицу">
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Horizontal rule */}
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Горизонтальная линия">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator />

        {/* Clear formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Очистить форматирование">
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
          <input autoFocus type="url" value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
            }}
            placeholder="https://example.com"
            className="flex-1 text-sm bg-background border rounded px-2 py-1 outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="button" onClick={applyLink} className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Применить
          </button>
          <button type="button" onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="text-xs px-2 py-1 border rounded hover:bg-muted">
            Отмена
          </button>
        </div>
      )}

      {/* Table controls */}
      {editor.isActive("table") && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-blue-50 border-b text-xs text-blue-700">
          <span className="font-medium mr-1">Таблица:</span>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100">+ столбец слева</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100">+ столбец справа</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100 text-red-500">− столбец</button>
          <span className="text-blue-300 mx-0.5">|</span>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100">+ строку выше</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100">+ строку ниже</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100 text-red-500">− строку</button>
          <span className="text-blue-300 mx-0.5">|</span>
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}
            disabled={!editor.can().mergeCells()}
            className={cn("px-1.5 py-0.5 rounded", editor.can().mergeCells() ? "hover:bg-blue-100" : "opacity-40 cursor-not-allowed")}
          >
            Объединить ячейки
          </button>
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().splitCell().run(); }}
            disabled={!editor.can().splitCell()}
            className={cn("px-1.5 py-0.5 rounded", editor.can().splitCell() ? "hover:bg-blue-100" : "opacity-40 cursor-not-allowed")}
          >
            Разделить ячейку
          </button>
          <span className="text-blue-300 mx-0.5">|</span>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }} className="px-1.5 py-0.5 rounded hover:bg-blue-100 text-red-600 font-medium">Удалить таблицу</button>
        </div>
      )}

      {/* Editor area */}
      <EditorContent editor={editor} className="rich-text-content px-3 py-3 text-sm" style={{ minHeight }} />
    </div>
  );
}
