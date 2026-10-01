"use client";

import * as React from "react";
import { Plus, Trash2, Ticket, Dices, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ShgCoupon } from "@/types/database";

// Short, readable random suffix — not cryptographically meaningful (a
// one-time discount code isn't a security credential), just enough entropy
// that two admins generating codes the same day don't collide.
function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function CouponsManager() {
  const [coupons, setCoupons] = React.useState<ShgCoupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState(10);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    const json = await res.json();
    setCoupons(json.data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function openNew() {
    setCode(`GUILD${randomSuffix()}`);
    setDiscountPercent(10);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, discount_percent: discountPercent }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Cupón creado.");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: ShgCoupon) {
    if (!confirm(`¿Eliminar el cupón "${c.code}"?`)) return;
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Cupón eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1" />Nuevo cupón</Button>
      </div>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Códigos de descuento de un solo uso para reservas de eventos. Cada uno aplica su
        porcentaje al total de la reserva y queda marcado como usado apenas se confirma esa reserva.
      </p>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : coupons.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay cupones cargados.</p>
      ) : (
        <div className="surface-parchment p-4 rounded-sm flex flex-col gap-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border",
                c.used ? "border-border bg-parchment-dark/30" : "border-brass/30 bg-brass/10"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Ticket size={16} className={c.used ? "text-leather-light shrink-0" : "text-brass shrink-0"} />
                <div className="min-w-0">
                  <p className="font-label text-sm font-bold text-ink truncate">{c.code}</p>
                  <p className="font-body text-xs text-ink-light">-{c.discount_percent}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.used ? (
                  <span className="flex items-center gap-1 font-label text-2xs uppercase tracking-wide text-ink-light">
                    <Check size={12} /> Usado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-label text-2xs uppercase tracking-wide text-moss-dark">
                    Disponible
                  </span>
                )}
                <button onClick={() => handleDelete(c)} className="p-1 text-leather-light hover:text-crimson transition-colors" aria-label={`Eliminar ${c.code}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cupón" closeOnBackdropClick={false}>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Input
              label="Código" required value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              wrapperClassName="flex-1" autoFocus
            />
            <Button type="button" variant="ghost" size="sm" className="h-11" onClick={() => setCode(`GUILD${randomSuffix()}`)} title="Generar otro código">
              <Dices size={16} />
            </Button>
          </div>
          <Input
            label="Descuento (%)" type="number" min={1} max={100} required
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            wrapperClassName="w-32"
          />
          <Button type="submit" loading={saving} className="mt-2">Guardar</Button>
        </form>
      </Modal>
    </div>
  );
}
