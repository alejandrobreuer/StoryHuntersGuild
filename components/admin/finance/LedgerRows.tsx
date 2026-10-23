"use client";

import * as React from "react";
import { Copy, Link2, Lock, LockOpen, MoreHorizontal, Paperclip, StickyNote, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PAY_METHOD_LABELS, STATUS_LABELS, TYPE_LABELS, formatShortDate, formatSignedMoney,
} from "@/lib/finance/format";
import type { LedgerRow } from "@/lib/finance/ledger";
import type { Draft, DraftErrors } from "@/lib/finance/draft";
import type { FinancePayMethod, FinanceTxStatus, FinanceTxType, ShgFinanceCategory } from "@/types/database";
import { StatusPill, TypePill, focusRing, inputClass, invalidClass } from "@/components/admin/finance/ui";

export interface EventOption { id: string; title: string; starts_at: string }
export interface TeamMember { id: string; name: string; is_active: boolean }

/** Column count, for the notes row and empty states. */
export const LEDGER_COLUMNS = 12;

const cell = "px-2.5 py-2 align-middle";
const iconButton = cn(
  "inline-flex items-center justify-center size-11 rounded-lg text-fin-muted hover:bg-fin-alt hover:text-fin-ink",
  focusRing,
);

function Amount({ row }: { row: Pick<LedgerRow, "type" | "amount" | "status"> }) {
  return (
    <span className={cn(
      "font-semibold tabular-nums whitespace-nowrap",
      row.status === "cancelled" ? "text-[#8A847C] line-through" : row.type === "income" ? "text-fin-income" : "text-fin-expense",
    )}>
      {formatSignedMoney(row.type, row.amount)}
    </span>
  );
}

// ─── Locked ──────────────────────────────────────────────────────────────────

export function LockedRow({
  row, busy, onUnlock, onOpenReceipt,
}: {
  row: LedgerRow;
  busy: boolean;
  onUnlock: () => void;
  onOpenReceipt: () => void;
}) {
  const fromBookings = row.source !== "manual";
  // Reservas rows can be edited too (after a confirmation); memberships can't.
  const readOnly = row.source === "subscription";
  const unlockLabel = row.source === "booking"
    ? "Desbloquear para editar (viene de Reservas)"
    : "Desbloquear fila para editar";
  return (
    <tr className="border-b border-fin-rowline last:border-b-0">
      <td className={cn(cell, "w-14 text-center")}>
        {readOnly ? (
          <span
            className="inline-flex size-11 items-center justify-center text-fin-muted"
            title="Movimiento automático: no se edita desde acá"
            aria-label="Movimiento automático: no se edita desde acá"
            role="img"
          >
            <Link2 size={16} />
          </span>
        ) : (
          <button
            type="button" className={iconButton} onClick={onUnlock} disabled={busy}
            aria-label={unlockLabel} title={unlockLabel}
          >
            <Lock size={16} />
          </button>
        )}
      </td>
      <td className={cn(cell, "tabular-nums text-fin-muted whitespace-nowrap")}>{formatShortDate(row.occurred_on)}</td>
      <td className={cell}><TypePill type={row.type} /></td>
      <td className={cn(cell, "max-w-0")}>
        <p className="truncate text-fin-ink" title={row.description}>{row.description}</p>
        {fromBookings ? (
          <p className="truncate text-xs text-fin-muted">Automático · desde Reservas</p>
        ) : row.notes ? (
          <p className="truncate text-xs italic text-fin-muted" title={row.notes}>{row.notes}</p>
        ) : row.recurring_id ? (
          <p className="truncate text-xs text-fin-muted">Automático · desde Suscripciones</p>
        ) : null}
      </td>
      <td className={cn(cell, "truncate")}>{row.category_name}</td>
      <td className={cn(cell, "truncate")}>{row.event_title ?? "General"}</td>
      <td className={cn(cell, "text-fin-muted truncate")}>{PAY_METHOD_LABELS[row.payment_method]}</td>
      <td className={cn(cell, "truncate")} title={row.responsible_name && row.source === "booking" ? `Cliente de la reserva: ${row.responsible_name}` : row.responsible_name ?? undefined}>
        {row.responsible_name ?? <span className="text-fin-muted" aria-label="Sin responsable">—</span>}
      </td>
      <td className={cn(cell, "text-right")}><Amount row={row} /></td>
      <td className={cn(cell, "text-center")}>
        {row.has_receipt ? (
          <button type="button" className={iconButton} onClick={onOpenReceipt} aria-label="Ver comprobante" title="Ver comprobante">
            <Paperclip size={16} />
          </button>
        ) : (
          <span className="text-fin-muted" aria-label="Sin comprobante">—</span>
        )}
      </td>
      <td className={cell}><StatusPill status={row.status} /></td>
      <td className={cell} />
    </tr>
  );
}

// ─── Editing ─────────────────────────────────────────────────────────────────

export interface EditingRowProps {
  draft: Draft;
  errors: DraftErrors;
  busy: boolean;
  uploading: boolean;
  categories: ShgFinanceCategory[];
  events: EventOption[];
  team: TeamMember[];
  descriptionRef: (el: HTMLInputElement | null) => void;
  onChange: (patch: Partial<Draft>) => void;
  onTypeChange: (type: FinanceTxType) => void;
  onSave: () => void;
  onDiscard: () => void;
  onUpload: (file: File) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function EditingRow(props: EditingRowProps) {
  const { draft, errors, busy, uploading, categories, events, team, onChange } = props;
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // Enter anywhere in the row saves and locks; Esc discards and locks.
  // Buttons keep their own Enter (upload, menu items).
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (menuOpen) { setMenuOpen(false); return; }
      props.onDiscard();
    } else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      props.onSave();
    }
  }

  const rowCategories = categories.filter(
    (c) => c.type === draft.type && (c.is_active || c.id === draft.category_id),
  );
  // Someone who left the team stays selectable on the rows that already name them.
  const rowTeam = team.filter((m) => m.is_active || m.id === draft.responsible_id);
  const responsibleHint = draft.type === "expense" ? "¿Quién pagó?" : "¿Quién cobró?";
  const label = (field: string) => `${field} (fila en edición)`;
  const err = (field: keyof DraftErrors) => (errors[field] ? invalidClass : "");

  return (
    <>
      <tr className="bg-fin-edit border-y border-fin-edit-border" onKeyDown={handleKeyDown}>
        <td className={cn(cell, "w-14 text-center")}>
          <button
            type="button" onClick={props.onSave} disabled={busy}
            className={cn("inline-flex items-center justify-center size-11 rounded-lg bg-fin-crimson text-white hover:bg-[#7a231d]", focusRing)}
            aria-label="Guardar y bloquear fila" title="Guardar y bloquear (Enter)"
          >
            <LockOpen size={16} />
          </button>
        </td>
        <td className={cell}>
          <input
            type="date" aria-label={label("Fecha")} value={draft.occurred_on} title={errors.occurred_on}
            aria-invalid={Boolean(errors.occurred_on)}
            onChange={(e) => onChange({ occurred_on: e.target.value })}
            className={cn(inputClass, "tabular-nums", err("occurred_on"))}
          />
        </td>
        <td className={cell}>
          <select
            aria-label={label("Tipo")} value={draft.type} disabled={draft.fromBooking}
            title={draft.fromBooking ? "El ingreso de una reserva no cambia de tipo" : undefined}
            onChange={(e) => props.onTypeChange(e.target.value as FinanceTxType)}
            className={inputClass}
          >
            {(Object.keys(TYPE_LABELS) as FinanceTxType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </td>
        <td className={cell}>
          <input
            ref={props.descriptionRef} type="text" aria-label={label("Concepto")} value={draft.description}
            placeholder={draft.type === "expense" ? "¿En qué se gastó?" : "¿De dónde vino?"}
            title={errors.description} aria-invalid={Boolean(errors.description)} maxLength={300}
            onChange={(e) => onChange({ description: e.target.value })}
            className={cn(inputClass, err("description"))}
          />
        </td>
        <td className={cell}>
          <select
            aria-label={label("Categoría")} value={draft.category_id} title={errors.category_id}
            aria-invalid={Boolean(errors.category_id)}
            onChange={(e) => onChange({ category_id: e.target.value })}
            className={cn(inputClass, err("category_id"))}
          >
            {!rowCategories.some((c) => c.id === draft.category_id) && <option value="">Elegí…</option>}
            {rowCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </td>
        <td className={cell}>
          <select
            aria-label={label("Evento")} value={draft.event_id}
            onChange={(e) => onChange({ event_id: e.target.value })}
            className={inputClass}
          >
            <option value="">General</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </td>
        <td className={cell}>
          <select
            aria-label={label("Medio")} value={draft.payment_method}
            onChange={(e) => onChange({ payment_method: e.target.value as FinancePayMethod })}
            className={inputClass}
          >
            {(Object.keys(PAY_METHOD_LABELS) as FinancePayMethod[]).map((m) => (
              <option key={m} value={m}>{PAY_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </td>
        <td className={cell}>
          {draft.fromBooking ? (
            // A reservation's "Responsable" is its client, from the booking.
            <p className="truncate px-1 text-fin-ink" title={`Cliente de la reserva${draft.bookingClient ? `: ${draft.bookingClient}` : ""}`}>
              {draft.bookingClient ?? <span className="text-fin-muted">—</span>}
            </p>
          ) : (
            <select
              aria-label={label(`Responsable: ${responsibleHint}`)} title={responsibleHint} value={draft.responsible_id}
              onChange={(e) => onChange({ responsible_id: e.target.value })}
              className={cn(inputClass, !draft.responsible_id && "text-fin-muted")}
            >
              <option value="">{responsibleHint}</option>
              {rowTeam.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </td>
        <td className={cell}>
          <input
            type="text" inputMode="decimal" aria-label={label("Monto")} value={draft.amount} placeholder="0"
            title={errors.amount} aria-invalid={Boolean(errors.amount)}
            onChange={(e) => onChange({ amount: e.target.value })}
            className={cn(inputClass, "text-right tabular-nums", err("amount"))}
          />
        </td>
        <td className={cn(cell, "text-center")}>
          {draft.fromBooking ? (
            <span className="text-fin-muted" title="El comprobante de una reserva se ve en Reservas">—</span>
          ) : (<>
          <input
            ref={fileInput} type="file" className="hidden" accept="image/*,application/pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onUpload(f); e.target.value = ""; }}
          />
          <button
            type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
            className={cn(
              "inline-flex items-center justify-center size-11 rounded-lg border border-dashed border-fin-input bg-white text-fin-muted hover:text-fin-ink",
              draft.receipt_path && "border-solid border-fin-ok text-fin-ok",
              uploading && "animate-pulse", focusRing,
            )}
            aria-label={draft.receipt_path ? "Reemplazar comprobante" : "Subir comprobante"}
            title={draft.receipt_path ? "Comprobante cargado — click para reemplazar" : "Subir comprobante (imagen o PDF, hasta 10 MB)"}
          >
            {draft.receipt_path ? <Paperclip size={16} /> : <Upload size={16} />}
          </button>
          </>)}
        </td>
        <td className={cell}>
          <select
            aria-label={label("Estado")} value={draft.status}
            onChange={(e) => onChange({ status: e.target.value as FinanceTxStatus })}
            className={inputClass}
          >
            {(Object.keys(STATUS_LABELS) as FinanceTxStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </td>
        <td className={cn(cell, "w-12")}>
          <div className="relative" ref={menuRef}>
            <button
              type="button" className={iconButton} onClick={() => setMenuOpen((o) => !o)}
              aria-label="Más acciones" aria-haspopup="menu" aria-expanded={menuOpen}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-fin-line bg-fin-surface py-1 shadow-lg">
                {!draft.fromBooking && (
                  <MenuItem icon={<Copy size={14} />} onClick={() => { setMenuOpen(false); props.onDuplicate(); }}>Duplicar</MenuItem>
                )}
                <MenuItem icon={<StickyNote size={14} />} onClick={() => { setMenuOpen(false); onChange({ showNotes: true }); }}>
                  {draft.notes ? "Editar nota" : "Agregar nota"}
                </MenuItem>
                {/* A reservation's income goes away by cancelling the booking in Reservas. */}
                {!draft.isNew && !draft.fromBooking && (
                  <MenuItem icon={<Trash2 size={14} />} danger onClick={() => { setMenuOpen(false); props.onDelete(); }}>Eliminar</MenuItem>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
      {draft.showNotes && (
        <tr className="bg-fin-edit border-b border-fin-edit-border" onKeyDown={handleKeyDown}>
          <td className={cell} />
          <td className={cell} colSpan={LEDGER_COLUMNS - 1}>
            <input
              type="text" aria-label={label("Nota")} value={draft.notes} placeholder="Nota (opcional)" maxLength={1000}
              autoFocus onChange={(e) => onChange({ notes: e.target.value })}
              className={inputClass}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function MenuItem({ icon, danger, onClick, children }: {
  icon: React.ReactNode; danger?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button" role="menuitem" onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 min-h-11 text-left text-sm hover:bg-fin-alt",
        danger ? "text-fin-crimson" : "text-fin-ink", focusRing,
      )}
    >
      {icon}{children}
    </button>
  );
}
