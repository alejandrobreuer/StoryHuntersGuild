"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Lock, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/format";
import {
  PERIOD_LABELS, filtersFromParams, filtersToParams, todayIso,
  type FinanceFilters, type PeriodKey, type TypeFilter,
} from "@/lib/finance/periods";
import type { LedgerRow, LedgerTotals } from "@/lib/finance/ledger";
import {
  draftFromRow, draftToPayload, newDraft, validateDraft, withType,
  type Draft, type DraftErrors,
} from "@/lib/finance/draft";
import type { FinanceTxType, ShgFinanceCategory } from "@/types/database";
import { Card, FinButton, focusRing, inputClass } from "@/components/admin/finance/ui";
import {
  EditingRow, LEDGER_COLUMNS, LockedRow, type EventOption, type TeamMember,
} from "@/components/admin/finance/LedgerRows";
import { exportLedger } from "@/components/admin/finance/exportLedger";

// Movimientos — the ledger. Spec §3 (Reference/Docs/finanzas/SPEC.md).
//
// Rows load locked. Unlocking one writes is_locked = false to the database
// (the lock lives there, enforced by a trigger), and the row becomes a
// Draft: inputs holding exactly what was typed. Enter validates, saves every
// field plus is_locked = true in one request, and shows the result right
// away (rolled back with a toast if the server refuses). Esc throws the
// changes away and locks the row again.

const EMPTY_TOTALS: LedgerTotals = { income: 0, expense: 0, net: 0 };

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

export function Ledger() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = React.useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const queryKey = filtersToParams(filters).toString();

  const [categories, setCategories] = React.useState<ShgFinanceCategory[]>([]);
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [me, setMe] = React.useState("");
  const [rows, setRows] = React.useState<LedgerRow[] | null>(null);
  const [count, setCount] = React.useState(0);
  const [totals, setTotals] = React.useState<LedgerTotals>(EMPTY_TOTALS);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Unlocked rows, by id. New rows ("new:<n>") live only here until saved.
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [newOrder, setNewOrder] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, DraftErrors>>({});
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [uploading, setUploading] = React.useState<Set<string>>(new Set());
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const descriptionRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const newCounter = React.useRef(0);

  // Latest state for callbacks that run after awaits.
  const draftsRef = React.useRef(drafts);
  draftsRef.current = drafts;

  const [search, setSearch] = React.useState(filters.q);

  // ── Loading ──────────────────────────────────────────────────────────────

  React.useEffect(() => {
    api<{ categories: ShgFinanceCategory[]; events: EventOption[]; team: TeamMember[]; me: string }>("/api/admin/finance/options")
      .then((d) => { setCategories(d.categories); setEvents(d.events); setTeam(d.team); setMe(d.me); })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  /** Rows left unlocked in the database (by anyone) open in edit mode. */
  const adoptUnlocked = React.useCallback((loaded: LedgerRow[]) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const r of loaded) {
        if (!r.is_locked && r.source === "manual" && !next[r.id]) next[r.id] = draftFromRow(r);
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setRows(null);
    api<{ rows: LedgerRow[]; count: number; totals: LedgerTotals }>(`/api/admin/finance/transactions?${queryKey}`)
      .then((d) => {
        if (cancelled) return;
        setRows(d.rows); setCount(d.count); setTotals(d.totals);
        adoptUnlocked(d.rows);
      })
      .catch((e: Error) => { if (!cancelled) { setRows([]); toast.error(e.message); } });
    return () => { cancelled = true; };
  }, [queryKey, adoptUnlocked]);

  const refreshTotals = React.useCallback(() => {
    api<{ count: number; totals: LedgerTotals }>(`/api/admin/finance/transactions?${queryKey}&totals=1`)
      .then((d) => { setCount(d.count); setTotals(d.totals); })
      .catch(() => undefined);
  }, [queryKey]);

  async function loadMore() {
    if (!rows) return;
    setLoadingMore(true);
    try {
      const d = await api<{ rows: LedgerRow[] }>(`/api/admin/finance/transactions?${queryKey}&offset=${rows.length}`);
      setRows((prev) => [...(prev ?? []), ...d.rows.filter((r) => !prev?.some((p) => p.id === r.id))]);
      adoptUnlocked(d.rows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Filters (in the URL) ─────────────────────────────────────────────────

  const setFilters = React.useCallback((patch: Partial<FinanceFilters>) => {
    const qs = filtersToParams({ ...filters, ...patch }).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  React.useEffect(() => { setSearch(filters.q); }, [filters.q]);
  React.useEffect(() => {
    if (search === filters.q) return;
    const t = setTimeout(() => setFilters({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search, filters.q, setFilters]);

  // ── Focus the concept input of a row that just opened ────────────────────

  React.useEffect(() => {
    if (!focusId) return;
    const el = descriptionRefs.current[focusId];
    if (el) { el.focus(); setFocusId(null); }
  }, [focusId, drafts]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function mark(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, on: boolean) {
    set((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  function dropDraft(id: string) {
    setDrafts((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setNewOrder((prev) => prev.filter((x) => x !== id));
  }

  function patchDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
    // Clear the error of a field as soon as it's edited.
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev[id] };
      for (const k of Object.keys(patch)) delete next[k as keyof DraftErrors];
      return { ...prev, [id]: next };
    });
  }

  /** What a saved draft looks like as a row, before the server answers. */
  function previewRow(draft: Draft, base?: LedgerRow): LedgerRow {
    const p = draftToPayload(draft);
    return {
      ...(base ?? {
        id: draft.id, source: "manual", booking_id: null, booking_number: null, created_at: new Date().toISOString(),
      }),
      ...p,
      category_name: categories.find((c) => c.id === p.category_id)?.name ?? "—",
      event_title: events.find((e) => e.id === p.event_id)?.title ?? null,
      responsible_name: team.find((m) => m.id === p.responsible_id)?.name ?? null,
      has_receipt: Boolean(p.receipt_path),
      is_locked: true,
    } as LedgerRow;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function unlock(row: LedgerRow) {
    setDrafts((prev) => ({ ...prev, [row.id]: draftFromRow(row) }));
    setFocusId(row.id);
    mark(setBusy, row.id, true);
    try {
      await api(`/api/admin/finance/transactions/${row.id}`, jsonInit("PATCH", { is_locked: false }));
    } catch (e) {
      dropDraft(row.id);
      toast.error((e as Error).message);
    } finally {
      mark(setBusy, row.id, false);
    }
  }

  function addRow(type: FinanceTxType, from?: Draft) {
    const id = `new:${++newCounter.current}`;
    const draft = from
      ? { ...from, id, isNew: true }
      : newDraft(id, type, todayIso(), categories, me);
    setDrafts((prev) => ({ ...prev, [id]: draft }));
    setNewOrder((prev) => [id, ...prev]);
    setFocusId(id);
  }

  /** Validates and saves one draft. Returns false if it stays open. */
  async function save(id: string): Promise<boolean> {
    const draft = draftsRef.current[id];
    if (!draft || busy.has(id)) return false;

    const found = validateDraft(draft, categories);
    if (Object.keys(found).length) {
      setErrors((prev) => ({ ...prev, [id]: found }));
      return false;
    }

    const payload = draftToPayload(draft);
    const before = rows?.find((r) => r.id === id);

    // Show it saved right away.
    dropDraft(id);
    setRows((prev) => {
      const list = prev ?? [];
      return draft.isNew ? [previewRow(draft), ...list] : list.map((r) => (r.id === id ? previewRow(draft, r) : r));
    });
    mark(setBusy, id, true);

    try {
      const saved = draft.isNew
        ? await api<LedgerRow>("/api/admin/finance/transactions", jsonInit("POST", payload))
        : await api<LedgerRow>(`/api/admin/finance/transactions/${id}`, jsonInit("PATCH", { ...payload, is_locked: true }));
      setRows((prev) => (prev ?? []).map((r) => (r.id === id ? saved : r)));
      refreshTotals();
      return true;
    } catch (e) {
      // Roll back: the row goes back to editing, exactly as it was typed.
      setRows((prev) => {
        const list = prev ?? [];
        return draft.isNew ? list.filter((r) => r.id !== id) : list.map((r) => (r.id === id && before ? before : r));
      });
      setDrafts((prev) => ({ ...prev, [id]: draft }));
      if (draft.isNew) setNewOrder((prev) => [id, ...prev]);
      toast.error((e as Error).message);
      return false;
    } finally {
      mark(setBusy, id, false);
    }
  }

  async function discard(id: string) {
    const draft = draftsRef.current[id];
    if (!draft) return;
    dropDraft(id);
    if (draft.isNew) return;
    try {
      await api(`/api/admin/finance/transactions/${id}`, jsonInit("PATCH", { is_locked: true }));
    } catch (e) {
      setDrafts((prev) => ({ ...prev, [id]: draft }));
      toast.error((e as Error).message);
    }
  }

  async function lockAll() {
    const ids = Object.keys(draftsRef.current);
    const results = await Promise.all(ids.map((id) => save(id)));
    const stillOpen = results.filter((ok) => !ok).length;
    if (stillOpen) {
      toast.error(stillOpen === 1
        ? "1 fila tiene errores y quedó abierta."
        : `${stillOpen} filas tienen errores y quedaron abiertas.`);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este movimiento? Deja de contar en los totales; queda guardado en el historial.")) return;
    mark(setBusy, id, true);
    try {
      await api(`/api/admin/finance/transactions/${id}`, { method: "DELETE" });
      dropDraft(id);
      setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
      refreshTotals();
      toast.success("Movimiento eliminado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      mark(setBusy, id, false);
    }
  }

  async function upload(id: string, file: File) {
    mark(setUploading, id, true);
    try {
      const body = new FormData();
      body.append("file", file);
      const d = await api<{ path: string }>("/api/admin/finance/receipts", { method: "POST", body });
      patchDraft(id, { receipt_path: d.path });
      toast.success("Comprobante cargado. Se guarda con la fila.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      mark(setUploading, id, false);
    }
  }

  async function openReceipt(id: string) {
    // Open the tab now (inside the click) so it isn't blocked as a popup.
    const tab = window.open("", "_blank");
    try {
      const d = await api<{ url: string }>(`/api/admin/finance/transactions/${id}/receipt`);
      if (tab) tab.location.href = d.url; else window.location.href = d.url;
    } catch (e) {
      tab?.close();
      toast.error((e as Error).message);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const d = await api<{ rows: LedgerRow[] }>(`/api/admin/finance/transactions?${queryKey}${queryKey ? "&" : ""}all=1`);
      if (!d.rows.length) { toast.error("No hay movimientos para exportar."); return; }
      await exportLedger(d.rows, `movimientos-${todayIso()}.xlsx`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // ── Unsaved rows: ask before leaving ─────────────────────────────────────

  const openCount = Object.keys(drafts).length;
  React.useEffect(() => {
    if (!openCount) return;
    const message = "Hay filas en edición sin guardar. ¿Salir igual?";
    function beforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); e.returnValue = message; }
    // In-app links don't fire beforeunload; catch them on the way out.
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || e.defaultPrevented) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!confirm(message)) { e.preventDefault(); e.stopPropagation(); }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [openCount]);

  // ── Render ───────────────────────────────────────────────────────────────

  const renderDraft = (draft: Draft) => (
    <EditingRow
      key={draft.id}
      draft={draft}
      errors={errors[draft.id] ?? {}}
      busy={busy.has(draft.id)}
      uploading={uploading.has(draft.id)}
      categories={categories}
      events={events}
      team={team}
      descriptionRef={(el) => { descriptionRefs.current[draft.id] = el; }}
      onChange={(patch) => patchDraft(draft.id, patch)}
      onTypeChange={(type) => setDrafts((prev) => ({ ...prev, [draft.id]: withType(prev[draft.id], type, categories) }))}
      onSave={() => { void save(draft.id); }}
      onDiscard={() => { void discard(draft.id); }}
      onUpload={(file) => { void upload(draft.id, file); }}
      onDuplicate={() => addRow(draft.type, draft)}
      onDelete={() => { void remove(draft.id); }}
    />
  );

  const typeTabs: [TypeFilter, string][] = [["todos", "Todos"], ["ingresos", "Ingresos"], ["gastos", "Gastos"]];

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-fin-ink">Movimientos</h1>
          <p className="mt-1 text-sm text-fin-muted">
            Cada fila es un gasto o un ingreso. Abrí el candado para editarla; Enter guarda y la vuelve a bloquear.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FinButton kind="primary" onClick={() => addRow("expense")} disabled={!categories.length}>
            <Plus size={16} />Gasto
          </FinButton>
          <FinButton kind="outline" onClick={() => addRow("income")} disabled={!categories.length}>
            <Plus size={16} />Ingreso
          </FinButton>
          <FinButton kind="ghost" onClick={handleExport} disabled={exporting}>
            <Download size={16} />Exportar a Excel
          </FinButton>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-5 p-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Buscar concepto, categoría o responsable</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fin-muted" />
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar concepto, categoría o responsable"
            className={cn(inputClass, "h-11 pl-9")}
          />
        </label>

        <div role="group" aria-label="Tipo" className="inline-flex rounded-lg border border-fin-input overflow-hidden">
          {typeTabs.map(([key, label]) => (
            <button
              key={key} type="button" aria-pressed={filters.tipo === key}
              onClick={() => setFilters({ tipo: key })}
              className={cn(
                "min-h-11 px-4 text-sm", focusRing,
                filters.tipo === key ? "bg-fin-ink text-white" : "bg-fin-surface text-fin-ink hover:bg-fin-alt",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-fin-muted">
          Evento
          <select value={filters.evento} onChange={(e) => setFilters({ evento: e.target.value })} className={cn(inputClass, "h-11 w-auto")}>
            <option value="">Todos los eventos</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            <option value="general">General</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-fin-muted">
          Período
          <select
            value={filters.periodo} onChange={(e) => setFilters({ periodo: e.target.value as PeriodKey })}
            className={cn(inputClass, "h-11 w-auto")}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
          </select>
        </label>

        {filters.periodo === "custom" && (
          <div className="flex items-center gap-2 text-sm text-fin-muted">
            <label className="flex items-center gap-1.5">
              Desde
              <input type="date" value={filters.desde} onChange={(e) => setFilters({ desde: e.target.value })} className={cn(inputClass, "h-11 w-auto")} />
            </label>
            <label className="flex items-center gap-1.5">
              Hasta
              <input type="date" value={filters.hasta} onChange={(e) => setFilters({ hasta: e.target.value })} className={cn(inputClass, "h-11 w-auto")} />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-fin-muted">
          Categoría
          <select value={filters.categoria} onChange={(e) => setFilters({ categoria: e.target.value })} className={cn(inputClass, "h-11 w-auto")}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.type === "income" ? " (ingreso)" : " (gasto)"}</option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-fin-muted" aria-live="polite">
            {openCount === 0 ? "Todo bloqueado" : openCount === 1 ? "1 fila en edición" : `${openCount} filas en edición`}
          </span>
          <FinButton kind="ghost" onClick={lockAll} disabled={!openCount}>
            <Lock size={16} />Bloquear todo
          </FinButton>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-14" /><col className="w-36" /><col className="w-28" /><col />
              <col className="w-36" /><col className="w-36" /><col className="w-36" /><col className="w-36" /><col className="w-32" />
              <col className="w-16" /><col className="w-32" /><col className="w-14" />
            </colgroup>
            <thead className="bg-fin-alt text-left text-xs font-semibold uppercase tracking-wide text-fin-muted">
              <tr className="border-b border-fin-line">
                <th scope="col" className="px-2.5 py-3 text-center"><Lock size={13} className="inline" aria-label="Candado" /></th>
                <th scope="col" className="px-2.5 py-3">Fecha</th>
                <th scope="col" className="px-2.5 py-3">Tipo</th>
                <th scope="col" className="px-2.5 py-3">Concepto</th>
                <th scope="col" className="px-2.5 py-3">Categoría</th>
                <th scope="col" className="px-2.5 py-3">Evento</th>
                <th scope="col" className="px-2.5 py-3">Medio</th>
                <th scope="col" className="px-2.5 py-3">Responsable</th>
                <th scope="col" className="px-2.5 py-3 text-right">Monto</th>
                <th scope="col" className="px-2.5 py-3 text-center">Comp.</th>
                <th scope="col" className="px-2.5 py-3">Estado</th>
                <th scope="col" className="px-2.5 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {newOrder.map((id) => drafts[id] && renderDraft(drafts[id]))}
              {rows === null ? (
                <tr><td colSpan={LEDGER_COLUMNS} className="px-4 py-10 text-center text-fin-muted">Cargando…</td></tr>
              ) : rows.length === 0 && newOrder.length === 0 ? (
                <tr><td colSpan={LEDGER_COLUMNS} className="px-4 py-10 text-center text-fin-muted">Todavía no hay movimientos en este período.</td></tr>
              ) : (
                rows.map((row) => drafts[row.id]
                  ? renderDraft(drafts[row.id])
                  : (
                    <LockedRow
                      key={row.id} row={row} busy={busy.has(row.id)}
                      onUnlock={() => { void unlock(row); }}
                      onOpenReceipt={() => { void openReceipt(row.id); }}
                    />
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: totals of every filtered row, cancelled excluded */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-fin-line bg-fin-alt px-5 py-4 text-sm">
          <span className="text-fin-muted">{count === 1 ? "1 movimiento" : `${count} movimientos`}</span>
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1 tabular-nums">
            <span className="text-fin-muted">Ingresos <strong className="font-semibold text-fin-income">{formatMoney(totals.income)}</strong></span>
            <span className="text-fin-muted">Gastos <strong className="font-semibold text-fin-expense">{formatMoney(totals.expense)}</strong></span>
            <span className="text-fin-muted">
              Neto{" "}
              <strong className={cn("text-lg font-semibold", totals.net < 0 ? "text-fin-expense" : "text-fin-income")}>
                {formatMoney(totals.net)}
              </strong>
            </span>
          </div>
        </div>
      </Card>

      {rows && rows.length < count && (
        <div className="mt-4 text-center">
          <FinButton kind="ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar más"}
          </FinButton>
        </div>
      )}

      <p className="mt-4 text-sm text-fin-muted">
        Las reservas de la web entran solas como ingresos (con el ícono de enlace) y se aprueban desde Reservas.
        Los gastos y los ingresos manuales se cargan acá.
      </p>
    </div>
  );
}
