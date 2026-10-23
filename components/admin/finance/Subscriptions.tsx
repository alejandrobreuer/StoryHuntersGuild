"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PAY_METHOD_LABELS, amountToInput, formatMoney, formatShortDate, parseAmount } from "@/lib/finance/format";
import { todayIso } from "@/lib/finance/periods";
import { monthlyTotal, nextChargeDate } from "@/lib/finance/recurring";
import type { FinancePayMethod, ShgFinanceCategory, ShgFinanceRecurring } from "@/types/database";
import { Card, FinButton, StatusPill, focusRing, inputClass, invalidClass } from "@/components/admin/finance/ui";
import type { TeamMember } from "@/components/admin/finance/LedgerRows";

// Suscripciones — monthly expenses (hosting, domains…) that write their own
// row in Movimientos on the charge day (shg_finance_run_recurring, 054).
// Edits apply to the months still to come; rows already written are
// corrected in Movimientos like any other. One with rows can't be deleted,
// only paused.

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

const labelClass = "flex flex-col gap-1 text-xs font-medium text-fin-muted";

type Payload = Omit<ShgFinanceRecurring, "id" | "created_by" | "created_at" | "updated_at">;

interface Form {
  name: string;
  amount: string;
  day_of_month: string;
  category_id: string;
  payment_method: FinancePayMethod;
  responsible_id: string;
  create_status: "pending" | "confirmed";
  starts_on: string;
  ends_on: string;
}

type FormErrors = Partial<Record<keyof Form, string>>;

function emptyForm(me: string): Form {
  return {
    name: "", amount: "", day_of_month: "", category_id: "", payment_method: "card",
    responsible_id: me, create_status: "pending", starts_on: todayIso(), ends_on: "",
  };
}

function formFrom(s: ShgFinanceRecurring): Form {
  return {
    name: s.name, amount: amountToInput(Number(s.amount)), day_of_month: String(s.day_of_month),
    category_id: s.category_id, payment_method: s.payment_method, responsible_id: s.responsible_id ?? "",
    create_status: s.create_status, starts_on: s.starts_on, ends_on: s.ends_on ?? "",
  };
}

function validate(f: Form): { errors: FormErrors; payload?: Omit<Payload, "is_active"> } {
  const errors: FormErrors = {};
  const amount = parseAmount(f.amount);
  const day = Number(f.day_of_month);
  if (!f.name.trim()) errors.name = "Escribí el nombre.";
  if (amount === null || amount <= 0) errors.amount = "Monto inválido.";
  if (!Number.isInteger(day) || day < 1 || day > 31) errors.day_of_month = "Del 1 al 31.";
  if (!f.category_id) errors.category_id = "Elegí una categoría.";
  if (!f.starts_on) errors.starts_on = "Elegí la fecha.";
  if (f.ends_on && f.starts_on && f.ends_on < f.starts_on) errors.ends_on = "Es anterior al inicio.";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    payload: {
      name: f.name.trim(), amount: amount!, day_of_month: day, category_id: f.category_id,
      payment_method: f.payment_method, responsible_id: f.responsible_id || null,
      create_status: f.create_status, starts_on: f.starts_on, ends_on: f.ends_on || null,
    },
  };
}

export function Subscriptions() {
  const [subs, setSubs] = React.useState<ShgFinanceRecurring[] | null>(null);
  const [categories, setCategories] = React.useState<ShgFinanceCategory[]>([]);
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [me, setMe] = React.useState("");
  const [editing, setEditing] = React.useState<ShgFinanceRecurring | "new" | null>(null);
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const today = todayIso();

  React.useEffect(() => {
    api<ShgFinanceRecurring[]>("/api/admin/finance/recurring")
      .then(setSubs)
      .catch((e: Error) => { setSubs([]); toast.error(e.message); });
    api<{ categories: ShgFinanceCategory[]; team: TeamMember[]; me: string }>("/api/admin/finance/options")
      .then((o) => { setCategories(o.categories); setTeam(o.team); setMe(o.me); })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  function mark(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  function replace(saved: ShgFinanceRecurring) {
    setSubs((prev) => (prev ?? []).map((s) => (s.id === saved.id ? saved : s)));
  }

  async function save(payload: Omit<Payload, "is_active">): Promise<boolean> {
    try {
      if (editing === "new") {
        const saved = await api<ShgFinanceRecurring>(
          "/api/admin/finance/recurring", jsonInit("POST", { ...payload, is_active: true }),
        );
        setSubs((prev) => [...(prev ?? []), saved]);
        toast.success(
          saved.starts_on <= today
            ? "Suscripción creada. Los cobros que ya pasaron están en Movimientos."
            : "Suscripción creada.",
        );
      } else if (editing) {
        replace(await api<ShgFinanceRecurring>(`/api/admin/finance/recurring/${editing.id}`, jsonInit("PATCH", payload)));
        toast.success("Suscripción guardada.");
      }
      setEditing(null);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }

  async function setActive(s: ShgFinanceRecurring, is_active: boolean) {
    mark(s.id, true);
    try {
      replace(await api<ShgFinanceRecurring>(`/api/admin/finance/recurring/${s.id}`, jsonInit("PATCH", { is_active })));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      mark(s.id, false);
    }
  }

  async function remove(s: ShgFinanceRecurring) {
    if (!confirm(`¿Eliminar la suscripción "${s.name}"?`)) return;
    mark(s.id, true);
    try {
      await api(`/api/admin/finance/recurring/${s.id}`, { method: "DELETE" });
      setSubs((prev) => (prev ?? []).filter((x) => x.id !== s.id));
      toast.success("Suscripción eliminada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      mark(s.id, false);
    }
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
  const memberName = (id: string | null) => (id ? team.find((t) => t.id === id)?.name ?? "—" : "—");

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-fin-ink">Suscripciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-fin-muted">
            Gastos que se repiten todos los meses. El día del cobro se crea solo el gasto en Movimientos
            (el último día del mes si ese mes es más corto). Los cambios valen para los meses que vienen.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {subs && subs.length > 0 && (
            <p className="text-sm text-fin-muted">
              Por mes <span className="ml-1 text-base font-semibold tabular-nums text-fin-ink">{formatMoney(monthlyTotal(subs))}</span>
            </p>
          )}
          {editing === null && (
            <FinButton kind="primary" onClick={() => setEditing("new")}><Plus size={16} />Nueva suscripción</FinButton>
          )}
        </div>
      </div>

      {editing !== null && (
        <SubscriptionForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? emptyForm(me) : formFrom(editing)}
          isNew={editing === "new"}
          categories={categories}
          team={team}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {subs === null ? (
        <Card className="px-4 py-10 text-center text-fin-muted">Cargando…</Card>
      ) : subs.length === 0 ? (
        <Card className="px-4 py-10 text-center text-fin-muted">
          Todavía no hay suscripciones. Creá una para que su gasto se cargue solo cada mes.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-fin-line bg-fin-alt text-left text-xs font-semibold uppercase tracking-wide text-fin-muted">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-3 py-3 text-right">Monto</th>
                <th className="px-3 py-3">Cobro</th>
                <th className="px-3 py-3">Medio</th>
                <th className="px-3 py-3">Responsable</th>
                <th className="px-3 py-3">Se crea</th>
                <th className="px-3 py-3">Próximo</th>
                <th className="px-3 py-3">Activa</th>
                <th className="px-2 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const next = nextChargeDate(s, today);
                return (
                  <tr key={s.id} className={cn("border-b border-fin-rowline last:border-b-0", !s.is_active && "text-fin-muted")}>
                    <td className="px-4 py-2">
                      <p className={cn("font-medium", s.is_active ? "text-fin-ink" : "line-through")}>{s.name}</p>
                      <p className="text-xs text-fin-muted">{categoryName(s.category_id)}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(s.amount))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">Día {s.day_of_month}</td>
                    <td className="px-3 py-2">{PAY_METHOD_LABELS[s.payment_method]}</td>
                    <td className="px-3 py-2">{memberName(s.responsible_id)}</td>
                    <td className="px-3 py-2"><StatusPill status={s.create_status} /></td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {next ? formatShortDate(next) : <span className="text-fin-muted">{s.is_active ? "Terminó" : "Pausada"}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox" checked={s.is_active} disabled={busy.has(s.id)}
                        onChange={(e) => { void setActive(s, e.target.checked); }}
                        aria-label={s.is_active ? `Pausar ${s.name}` : `Reactivar ${s.name}`}
                        title={s.is_active ? "Pausar" : "Reactivar (vuelve a cobrar desde hoy)"}
                        className={cn("size-4 accent-fin-crimson", focusRing)}
                      />
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-right">
                      <button type="button" className={iconButton} onClick={() => setEditing(s)} disabled={busy.has(s.id)}
                        aria-label={`Editar ${s.name}`} title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className={iconButton} onClick={() => { void remove(s); }} disabled={busy.has(s.id)}
                        aria-label={`Eliminar ${s.name}`} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── New / edit form ─────────────────────────────────────────────────────────

function SubscriptionForm({
  initial, isNew, categories, team, onSave, onCancel,
}: {
  initial: Form;
  isNew: boolean;
  categories: ShgFinanceCategory[];
  team: TeamMember[];
  onSave: (payload: Omit<Payload, "is_active">) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<Form>(initial);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saving, setSaving] = React.useState(false);

  // Active expense categories, plus the current one if it was deactivated since.
  const categoryOptions = categories.filter(
    (c) => c.type === "expense" && (c.is_active || c.id === initial.category_id),
  );
  const teamOptions = team.filter((t) => t.is_active || t.id === initial.responsible_id);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { errors: found, payload } = validate(form);
    setErrors(found);
    if (!payload || saving) return;
    setSaving(true);
    await onSave(payload);
    setSaving(false);
  }

  const field = (key: keyof Form) => cn(inputClass, errors[key] && invalidClass);
  const error = (key: keyof Form) =>
    errors[key] ? <span className="text-xs font-normal text-red-700">{errors[key]}</span> : null;

  return (
    <Card className="mb-5 p-4 sm:p-5">
      <form onSubmit={submit} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}>
        <h2 className="mb-4 text-base font-semibold text-fin-ink">{isNew ? "Nueva suscripción" : "Editar suscripción"}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={cn(labelClass, "sm:col-span-2")}>
            Nombre
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120}
              placeholder="Vercel Pro" autoFocus className={field("name")} />
            {error("name")}
          </label>
          <label className={labelClass}>
            Monto por mes ($)
            <input type="text" inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)}
              placeholder="25.000" className={field("amount")} />
            {error("amount")}
          </label>
          <label className={labelClass}>
            Día del cobro
            <input type="number" min={1} max={31} value={form.day_of_month}
              onChange={(e) => set("day_of_month", e.target.value)} placeholder="5" className={field("day_of_month")} />
            {error("day_of_month")}
          </label>
          <label className={labelClass}>
            Categoría
            <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)} className={field("category_id")}>
              <option value="">Elegí…</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {error("category_id")}
          </label>
          <label className={labelClass}>
            Medio de pago
            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value as FinancePayMethod)}
              className={field("payment_method")}>
              {(Object.keys(PAY_METHOD_LABELS) as FinancePayMethod[]).map((m) => <option key={m} value={m}>{PAY_METHOD_LABELS[m]}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Responsable
            <select value={form.responsible_id} onChange={(e) => set("responsible_id", e.target.value)} className={field("responsible_id")}>
              <option value="">Nadie</option>
              {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Se crea como
            <select value={form.create_status} onChange={(e) => set("create_status", e.target.value as Form["create_status"])}
              className={field("create_status")}>
              <option value="pending">Pendiente (revisar el monto)</option>
              <option value="confirmed">Confirmado (monto fijo)</option>
            </select>
          </label>
          <label className={labelClass}>
            Desde
            <input type="date" value={form.starts_on} onChange={(e) => set("starts_on", e.target.value)} className={field("starts_on")} />
            {error("starts_on")}
          </label>
          <label className={labelClass}>
            Hasta (opcional)
            <input type="date" value={form.ends_on} onChange={(e) => set("ends_on", e.target.value)} className={field("ends_on")} />
            {error("ends_on")}
          </label>
        </div>
        <p className="mt-3 text-xs text-fin-muted">
          {isNew
            ? "Si \"Desde\" es una fecha pasada, también se cargan los meses que ya se cobraron."
            : "Los cambios valen para los próximos cobros; los gastos ya cargados se corrigen en Movimientos."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <FinButton onClick={onCancel}>Cancelar</FinButton>
          <FinButton type="submit" kind="primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</FinButton>
        </div>
      </form>
    </Card>
  );
}
