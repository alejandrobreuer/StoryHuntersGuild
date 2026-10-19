"use client";

import * as React from "react";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectProps<T extends MultiSelectOption> {
  options: T[];
  value: string[];
  onToggle: (id: string) => void;
  /** When provided, each option gets a trash button to remove it from the list entirely. */
  onDeleteOption?: (option: T) => void;
  deleteTitle?: string;
  placeholder?: string;
  /** Summary shown when several options are selected, e.g. (n) => `${n} tags seleccionados`. */
  pluralSummary: (count: number) => string;
  emptyMessage: string;
}

/** Dropdown styled like <Select>, but each option is a checkbox so several can
 * be selected at once. */
export function MultiSelect<T extends MultiSelectOption>({
  options, value, onToggle, onDeleteOption, deleteTitle = "Eliminar de la lista",
  placeholder = "Sin asignar", pluralSummary, emptyMessage,
}: MultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const summary =
    value.length === 0 ? placeholder
    : value.length === 1 ? (options.find((o) => o.id === value[0])?.label ?? pluralSummary(1))
    : pluralSummary(value.length);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between font-body text-sm text-ink text-left",
          "bg-parchment/60 border border-border px-3.5 py-2.5 outline-none",
          "focus:border-brass focus:ring-1 focus:ring-brass/40 transition-colors",
          open && "border-brass"
        )}
      >
        <span className={cn(value.length === 0 && "text-ink-light")}>{summary}</span>
        <ChevronDown size={15} className={cn("text-leather-light transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto border border-border bg-parchment shadow-lg">
          {options.length === 0 ? (
            <p className="font-body text-xs text-ink-light px-3.5 py-2.5">{emptyMessage}</p>
          ) : (
            options.map((o) => {
              const selected = value.includes(o.id);
              return (
                <div key={o.id} className="flex items-center hover:bg-parchment-dark/40">
                  <button
                    type="button"
                    onClick={() => onToggle(o.id)}
                    className="flex-1 flex items-center gap-2.5 px-3.5 py-2 font-body text-sm text-ink text-left"
                  >
                    <span
                      className={cn(
                        "size-4 shrink-0 border flex items-center justify-center",
                        selected ? "bg-moss border-moss text-parchment" : "border-border"
                      )}
                    >
                      {selected && <Check size={12} />}
                    </span>
                    {o.label}
                  </button>
                  {onDeleteOption && (
                    <button
                      type="button"
                      onClick={() => onDeleteOption(o)}
                      title={deleteTitle}
                      className="px-3 py-2 text-leather-light hover:text-crimson transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
