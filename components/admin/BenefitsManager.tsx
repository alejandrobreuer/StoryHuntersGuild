"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Gift, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BENEFIT_KIND_LABEL, describeBenefit } from "@/lib/benefitLabels";
import type { BenefitKind, RewardTarget, ShgBenefit, ShgRank } from "@/types/database";

type BenefitRow = ShgBenefit & { rank: Pick<ShgRank, "id" | "name" | "rp_required"> | null };
type Pending = { user_id: string; user_label: string; email: string; benefit_id: string; benefit_name: string };

const KIND_HELP: Record<BenefitKind, string> = {
  custom:          "Algo que entregás en mano (una remera, un pin…). Queda en la lista de entregas pendientes hasta que lo marques como entregado.",
  event_discount:  "Descuento automático en la entrada del jugador, en cada reserva. Si tiene varios, se aplica el más alto.",
  monthly_invites: "Cada mes el jugador recibe códigos para compartir. Solo los puede usar alguien que nunca reservó. Vencen al terminar el mes siguiente.",
  monthly_2x1:     "Algunas veces por mes, en una reserva de 2 o más personas, una entrada es gratis.",
  free_tickets:    "Entradas gratis que el jugador usa cuando quiera, una sola vez cada una.",
  bonus_rewards:   "Más XP o RP al asistir a eventos y completar misiones. Si tiene varios, se aplica el más alto.",
};

const USES_PERCENT: BenefitKind[] = ["event_discount", "monthly_invites", "bonus_rewards"];
const USES_QUANTITY: BenefitKind[] = ["monthly_invites", "monthly_2x1", "free_tickets"];

const EMPTY = {
  name: "", description: "", kind: "custom" as BenefitKind, unlock_type: "rank" as "rank" | "level",
  rank_id: "", min_level: 5, percent: 10, quantity: 1, applies_to: "xp" as RewardTarget, active: true,
};

export function BenefitsManager() {
  const [benefits, setBenefits] = React.useState<BenefitRow[]>([]);
  const [ranks, setRanks] = React.useState<ShgRank[]>([]);
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<BenefitRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [deliveringKey, setDeliveringKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [benefitsRes, ranksRes, pendingRes] = await Promise.all([
      fetch("/api/admin/benefits"), fetch("/api/admin/ranks"), fetch("/api/admin/benefits/deliveries"),
    ]);
    setBenefits((await benefitsRes.json().catch(() => ({}))).data ?? []);
    setRanks((await ranksRes.json().catch(() => ({}))).data ?? []);
    setPending((await pendingRes.json().catch(() => ({}))).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Grouped by what unlocks them, in progression order: ranks by RP, then levels.
  const groups = React.useMemo(() => {
    const byKey = new Map<string, { title: string; order: number; items: BenefitRow[] }>();
    for (const b of benefits) {
      const key = b.unlock_type === "rank" ? `r:${b.rank_id}` : `l:${b.min_level}`;
      const title = b.unlock_type === "rank" ? `Rango ${b.rank?.name ?? "?"} (${b.rank?.rp_required ?? 0} RP)` : `Nivel ${b.min_level}`;
      const order = b.unlock_type === "rank" ? (b.rank?.rp_required ?? 0) : 1_000_000 + (b.min_level ?? 0);
      if (!byKey.has(key)) byKey.set(key, { title, order, items: [] });
      byKey.get(key)!.items.push(b);
    }
    return Array.from(byKey.values()).sort((a, b) => a.order - b.order);
  }, [benefits]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, rank_id: ranks[0]?.id ?? "", unlock_type: ranks.length > 0 ? "rank" : "level" });
    setModalOpen(true);
  }

  function openEdit(b: BenefitRow) {
    setEditing(b);
    setForm({
      name: b.name, description: b.description ?? "", kind: b.kind, unlock_type: b.unlock_type,
      rank_id: b.rank_id ?? ranks[0]?.id ?? "", min_level: b.min_level ?? 5,
      percent: b.percent ?? 10, quantity: b.quantity ?? 1, applies_to: b.applies_to ?? "xp", active: b.active,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/benefits/${editing.id}` : "/api/admin/benefits", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rank_id: form.unlock_type === "rank" ? form.rank_id : null,
          min_level: form.unlock_type === "level" ? Number(form.min_level) : null,
          percent: Number(form.percent),
          quantity: Number(form.quantity),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success(editing ? "Beneficio actualizado." : "Beneficio creado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: BenefitRow) {
    if (!confirm(`¿Eliminar "${b.name}"? También se borra su historial (entregas, usos e invitaciones). Para dejar de darlo sin perder el historial, pausalo.`)) return;
    const res = await fetch(`/api/admin/benefits/${b.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Beneficio eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  async function markDelivered(p: Pending) {
    const key = `${p.user_id}:${p.benefit_id}`;
    setDeliveringKey(key);
    try {
      const res = await fetch("/api/admin/benefits/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: p.user_id, benefit_id: p.benefit_id }),
      });
      if (!res.ok) { toast.error("No se pudo marcar como entregado."); return; }
      setPending((list) => list.filter((x) => `${x.user_id}:${x.benefit_id}` !== key));
      toast.success(`${p.benefit_name} entregado a ${p.user_label}.`);
    } finally {
      setDeliveringKey(null);
    }
  }

  const kind = form.kind;

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo beneficio</Button>
      </div>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Beneficios que los jugadores desbloquean al llegar a un rango (RP) o a un nivel (XP). Cada jugador
        conserva todos los que ya desbloqueó. Lo ven en su perfil, y los descuentos se aplican solos al reservar.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {pending.length > 0 && (
            <section className="surface-parchment p-4 rounded-sm">
              <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-ink mb-3 flex items-center gap-1.5">
                <PackageCheck size={14} /> Entregas pendientes ({pending.length})
              </h3>
              <ul className="flex flex-col divide-y divide-border">
                {pending.map((p) => (
                  <li key={`${p.user_id}:${p.benefit_id}`} className="flex items-center justify-between gap-3 py-2 flex-wrap">
                    <span className="font-body text-sm text-ink min-w-0">
                      <strong>{p.benefit_name}</strong> para {p.user_label}
                      {p.user_label !== p.email && <span className="text-ink-light"> · {p.email}</span>}
                    </span>
                    <Button size="sm" variant="secondary" loading={deliveringKey === `${p.user_id}:${p.benefit_id}`} onClick={() => markDelivered(p)}>
                      Entregado
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {groups.length === 0 ? (
            <p className="font-body italic text-parchment-dark">Todavía no hay beneficios.</p>
          ) : groups.map((g) => (
            <section key={g.title}>
              <h3 className="font-label text-xs font-semibold uppercase tracking-widest text-parchment mb-2">{g.title}</h3>
              <div className="surface-parchment p-3 rounded-sm flex flex-col divide-y divide-border">
                {g.items.map((b) => (
                  <div key={b.id} className={cn("flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0", !b.active && "opacity-60")}>
                    <div className="min-w-0 flex gap-2.5">
                      <Gift size={16} className="text-brass shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-label text-sm font-bold text-ink">
                          {b.name}
                          <span className="ml-2 font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass align-middle">
                            {BENEFIT_KIND_LABEL[b.kind]}
                          </span>
                          {!b.active && (
                            <span className="ml-1.5 font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/15 text-leather align-middle">Pausado</span>
                          )}
                        </p>
                        {b.kind !== "custom" && <p className="font-body text-xs text-ink-light">{describeBenefit(b)}</p>}
                        {b.description && <p className="font-body text-xs text-ink-light italic">{b.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(b)} className="p-1.5 text-leather-light hover:text-brass transition-colors" aria-label={`Editar ${b.name}`}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(b)} className="p-1.5 text-leather-light hover:text-crimson transition-colors" aria-label={`Eliminar ${b.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar beneficio" : "Nuevo beneficio"}
        footer={<Button type="submit" form="benefits-manager-form" loading={saving} className="w-full">Guardar</Button>}
      >
        <form id="benefits-manager-form" onSubmit={handleSave} className="flex flex-col gap-3">
          <Select label="Tipo" value={kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BenefitKind })}>
            {(Object.keys(BENEFIT_KIND_LABEL) as BenefitKind[]).map((k) => (
              <option key={k} value={k}>{BENEFIT_KIND_LABEL[k]}</option>
            ))}
          </Select>
          <p className="font-body text-xs text-ink-light -mt-1">{KIND_HELP[kind]}</p>

          <Input
            label="Nombre" required maxLength={100}
            placeholder={kind === "custom" ? "Una remera del gremio" : BENEFIT_KIND_LABEL[kind]}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {(USES_PERCENT.includes(kind) || USES_QUANTITY.includes(kind)) && (
            <div className="grid grid-cols-2 gap-3">
              {USES_PERCENT.includes(kind) && (
                <Input
                  label={kind === "monthly_invites" ? "Descuento del invitado (%)" : kind === "bonus_rewards" ? "Extra (%)" : "Descuento (%)"}
                  type="number" min={1} max={100} required
                  value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })}
                />
              )}
              {USES_QUANTITY.includes(kind) && (
                <Input
                  label={kind === "free_tickets" ? "Entradas (en total)" : kind === "monthly_invites" ? "Códigos por mes" : "Usos por mes"}
                  type="number" min={1} max={50} required
                  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              )}
              {kind === "bonus_rewards" && (
                <Select
                  label="Aplica a" value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value as RewardTarget })}
                >
                  <option value="xp">XP</option>
                  <option value="rp">RP</option>
                  <option value="both">XP y RP</option>
                </Select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 items-end">
            <Select
              label="Se desbloquea por" value={form.unlock_type}
              onChange={(e) => setForm({ ...form, unlock_type: e.target.value as "rank" | "level" })}
            >
              <option value="rank" disabled={ranks.length === 0}>Rango (RP)</option>
              <option value="level">Nivel (XP)</option>
            </Select>
            {form.unlock_type === "rank" ? (
              <Select label="Rango" value={form.rank_id} onChange={(e) => setForm({ ...form, rank_id: e.target.value })}>
                {ranks.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.rp_required} RP)</option>)}
              </Select>
            ) : (
              <Input
                label="Nivel" type="number" min={1} max={999} required
                value={form.min_level} onChange={(e) => setForm({ ...form, min_level: Number(e.target.value) })}
              />
            )}
          </div>

          <Textarea
            label="Descripción (opcional)" rows={2} maxLength={500}
            placeholder="Se muestra en el perfil del jugador."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="flex items-center gap-2 font-body text-sm text-ink">
            <input type="checkbox" className="accent-moss size-4" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Activo <span className="text-ink-light">(si lo pausás, deja de darse pero se guarda su historial)</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
