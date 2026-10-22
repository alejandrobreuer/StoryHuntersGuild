"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TYPE_LABELS } from "@/lib/finance/format";
import { categoriesOfType, moveCategory, withOrder } from "@/lib/finance/categories";
import type { FinanceTxType, ShgFinanceCategory } from "@/types/database";
import { Card, FinButton, focusRing, inputClass } from "@/components/admin/finance/ui";

// Categorías — spec §6 step 5: name, type, active, order. System categories
// (Reservas, Membresías) can be renamed and reordered, not deleted or
// deactivated; the database enforces that (shg_finance_category_guard) and
// these controls just don't offer it. A category with movements can't be
// deleted either: the error suggests deactivating it, which hides it from
// new rows while old ones keep their name.

interface ApiError { error?: string }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => ({}))) as { data?: T } & ApiError;
  if (!res.ok) throw new Error(json.error ?? "Ocurrió un error.");
  return json.data as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const iconButton = cn(
  "inline-flex items-center justify-center size-11 rounded-lg text-fin-muted hover:bg-fin-alt hover:text-fin-ink",
  "disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed",
  focusRing,
);

const SYSTEM_HINT = "Categoría del sistema: se puede renombrar y reordenar, pero no eliminar ni desactivar.";

export function Categories() {
  const [categories, setCategories] = React.useState<ShgFinanceCategory[] | null>(null);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    api<ShgFinanceCategory[]>("/api/admin/finance/categories")
      .then(setCategories)
      .catch((e: Error) => { setCategories([]); toast.error(e.message); });
  }, []);

  function mark(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  function replace(saved: ShgFinanceCategory) {
    setCategories((prev) => (prev ?? []).map((c) => (c.id === saved.id ? saved : c)));
  }

  /** Saves some fields of one category. Returns false if the server refused. */
  async function update(id: string, patch: Partial<Pick<ShgFinanceCategory, "name" | "type" | "is_active">>): Promise<boolean> {
    mark(id, true);
    try {
      replace(await api<ShgFinanceCategory>(`/api/admin/finance/categories/${id}`, jsonInit("PATCH", patch)));
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      mark(id, false);
    }
  }

  async function create(name: string, type: FinanceTxType): Promise<boolean> {
    try {
      const saved = await api<ShgFinanceCategory>(
        "/api/admin/finance/categories", jsonInit("POST", { name, type, is_active: true }),
      );
      setCategories((prev) => [...(prev ?? []), saved]);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  async function remove(category: ShgFinanceCategory) {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    mark(category.id, true);
    try {
      await api(`/api/admin/finance/categories/${category.id}`, { method: "DELETE" });
      setCategories((prev) => (prev ?? []).filter((c) => c.id !== category.id));
      toast.success("Categoría eliminada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      mark(category.id, false);
    }
  }

  async function move(type: FinanceTxType, id: string, direction: -1 | 1) {
    if (!categories) return;
    const ids = moveCategory(categoriesOfType(categories, type), id, direction);
    if (!ids) return;
    // Show the new order right away; put the old one back if it fails.
    const before = categories;
    setCategories(withOrder(categories, ids));
    try {
      await api("/api/admin/finance/categories/order", jsonInit("PUT", { type, ids }));
    } catch (e) {
      setCategories(before);
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold text-fin-ink">Categorías</h1>
        <p className="mt-1 text-sm text-fin-muted">
          El orden de cada lista es el de los selectores de Movimientos. Una categoría inactiva no se ofrece
          en filas nuevas, pero los movimientos que ya la usan la conservan.
        </p>
      </div>

      {categories === null ? (
        <Card className="px-4 py-10 text-center text-fin-muted">Cargando…</Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(["expense", "income"] as FinanceTxType[]).map((type) => (
            <CategoryList
              key={type}
              type={type}
              categories={categoriesOfType(categories, type)}
              busy={busy}
              onUpdate={update}
              onCreate={(name) => create(name, type)}
              onDelete={(c) => { void remove(c); }}
              onMove={(id, direction) => { void move(type, id, direction); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── One type's list ─────────────────────────────────────────────────────────

function CategoryList({
  type, categories, busy, onUpdate, onCreate, onDelete, onMove,
}: {
  type: FinanceTxType;
  categories: ShgFinanceCategory[];
  busy: Set<string>;
  onUpdate: (id: string, patch: Partial<Pick<ShgFinanceCategory, "name" | "type" | "is_active">>) => Promise<boolean>;
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (category: ShgFinanceCategory) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const title = type === "expense" ? "Gastos" : "Ingresos";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    if (await onCreate(name)) setNewName("");
    setAdding(false);
  }

  return (
    <Card className="overflow-hidden">
      <h2 className="border-b border-fin-line bg-fin-alt px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fin-muted">
        {title} <span className="font-normal normal-case tracking-normal">· {categories.length}</span>
      </h2>
      <ul>
        {categories.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            first={i === 0}
            last={i === categories.length - 1}
            busy={busy.has(c.id)}
            onUpdate={(patch) => onUpdate(c.id, patch)}
            onDelete={() => onDelete(c)}
            onMove={(direction) => onMove(c.id, direction)}
          />
        ))}
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-fin-muted">Todavía no hay categorías de {title.toLowerCase()}.</li>
        )}
      </ul>
      <form onSubmit={add} className="flex gap-2 border-t border-fin-line bg-fin-alt px-4 py-3">
        <label className="flex-1">
          <span className="sr-only">Nueva categoría de {title.toLowerCase()}</span>
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60}
            placeholder={`Nueva categoría de ${title.toLowerCase()}`}
            className={cn(inputClass, "h-11")}
          />
        </label>
        <FinButton type="submit" kind="outline" disabled={!newName.trim() || adding}>
          <Plus size={16} />Agregar
        </FinButton>
      </form>
    </Card>
  );
}

// ─── One category ────────────────────────────────────────────────────────────

function CategoryRow({
  category: c, first, last, busy, onUpdate, onDelete, onMove,
}: {
  category: ShgFinanceCategory;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUpdate: (patch: Partial<Pick<ShgFinanceCategory, "name" | "type" | "is_active">>) => Promise<boolean>;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(c.name);
  const [type, setType] = React.useState<FinanceTxType>(c.type);

  function startEditing() {
    setName(c.name); setType(c.type); setEditing(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Escribí el nombre."); return; }
    const patch: Partial<Pick<ShgFinanceCategory, "name" | "type">> = {};
    if (trimmed !== c.name) patch.name = trimmed;
    if (type !== c.type) patch.type = type;
    if (!Object.keys(patch).length || await onUpdate(patch)) setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
    else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); void save(); }
  }

  return (
    <li
      className={cn("flex items-center gap-1 border-b border-fin-rowline px-2 py-1 last:border-b-0", editing && "bg-fin-edit")}
      onKeyDown={editing ? handleKeyDown : undefined}
    >
      <div className="flex shrink-0">
        <button type="button" className={iconButton} disabled={first || busy} onClick={() => onMove(-1)}
          aria-label={`Subir ${c.name}`} title="Subir">
          <ChevronUp size={16} />
        </button>
        <button type="button" className={iconButton} disabled={last || busy} onClick={() => onMove(1)}
          aria-label={`Bajar ${c.name}`} title="Bajar">
          <ChevronDown size={16} />
        </button>
      </div>

      {editing ? (
        <>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus
            aria-label="Nombre de la categoría" className={cn(inputClass, "min-w-0 flex-1")}
          />
          <select
            value={type} onChange={(e) => setType(e.target.value as FinanceTxType)}
            disabled={c.is_system} title={c.is_system ? SYSTEM_HINT : "Sólo si todavía no tiene movimientos"}
            aria-label="Tipo de la categoría" className={cn(inputClass, "w-28 shrink-0")}
          >
            {(Object.keys(TYPE_LABELS) as FinanceTxType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <button type="button" className={iconButton} onClick={() => { void save(); }} disabled={busy}
            aria-label="Guardar" title="Guardar (Enter)">
            <Check size={16} />
          </button>
          <button type="button" className={iconButton} onClick={() => setEditing(false)}
            aria-label="Cancelar" title="Cancelar (Esc)">
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1 px-1">
            <span className={cn("truncate", c.is_active ? "text-fin-ink" : "text-fin-muted line-through")}>{c.name}</span>
            {c.is_system && (
              <span className="ml-2 rounded-full bg-fin-alt px-2 py-0.5 text-xs text-fin-muted" title={SYSTEM_HINT}>Sistema</span>
            )}
          </div>
          <label
            className={cn("flex shrink-0 items-center gap-2 px-2 text-sm", c.is_system ? "text-fin-muted" : "text-fin-ink cursor-pointer")}
            title={c.is_system ? SYSTEM_HINT : undefined}
          >
            <input
              type="checkbox" checked={c.is_active} disabled={c.is_system || busy}
              onChange={(e) => { void onUpdate({ is_active: e.target.checked }); }}
              className={cn("size-4 accent-fin-crimson", focusRing)}
            />
            Activa
          </label>
          <button type="button" className={iconButton} onClick={startEditing} disabled={busy}
            aria-label={`Editar ${c.name}`} title="Editar">
            <Pencil size={16} />
          </button>
          {c.is_system ? (
            <span className="size-11 shrink-0" aria-hidden />
          ) : (
            <button type="button" className={iconButton} onClick={onDelete} disabled={busy}
              aria-label={`Eliminar ${c.name}`} title="Eliminar">
              <Trash2 size={16} />
            </button>
          )}
        </>
      )}
    </li>
  );
}
