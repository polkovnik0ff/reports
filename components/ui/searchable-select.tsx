"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— не выбран —",
  searchPlaceholder = "Поиск...",
  emptyText = "Ничего не найдено",
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q)
        );
      })
    : options;

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-full h-8 rounded-lg border bg-background px-3 text-sm text-left flex items-center justify-between gap-2",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? (
            <>
              {selected.label}
              {selected.sublabel && (
                <span className="text-muted-foreground ml-1">({selected.sublabel})</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {/* Empty option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer",
                !value && "bg-accent/50"
              )}
            >
              <span className="text-muted-foreground">{placeholder}</span>
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-accent cursor-pointer flex items-baseline gap-1.5",
                    o.value === value && "bg-accent/50"
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.sublabel && (
                    <span className="text-muted-foreground text-xs shrink-0 truncate">{o.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
