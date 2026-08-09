"use client";

import * as React from "react";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import { levelForXp } from "@/lib/gamification/progression";
import { currentRank } from "@/lib/gamification/ranks";
import type { ShgUserPublic, ShgRank } from "@/types/database";

export function UsersManager() {
  const [users, setUsers] = React.useState<ShgUserPublic[]>([]);
  const [ranks, setRanks] = React.useState<ShgRank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ShgUserPublic | null>(null);
  const [adjustXp, setAdjustXp] = React.useState("");
  const [adjustRp, setAdjustRp] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [usersRes, ranksRes] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/ranks")]);
    setUsers((await usersRes.json()).data ?? []);
    setRanks((await ranksRes.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q));
  }, [users, query]);

  function openDetail(u: ShgUserPublic) {
    setSelected(u);
    setAdjustXp("");
    setAdjustRp("");
  }

  async function toggleSubscriber(u: ShgUserPublic) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_subscriber: !u.is_subscriber }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Error al actualizar."); return; }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? json.data : x)));
    setSelected((prev) => (prev && prev.id === u.id ? json.data : prev));
    toast.success(json.data.is_subscriber ? "Suscripción activada." : "Suscripción desactivada.");
  }

  async function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const xp = adjustXp.trim() ? Number(adjustXp) : 0;
    const rp = adjustRp.trim() ? Number(adjustRp) : 0;
    if (!xp && !rp) { toast.error("Ingresá un ajuste de XP o RP."); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustXp: xp, adjustRp: rp }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al ajustar."); return; }
      setUsers((prev) => prev.map((x) => (x.id === selected.id ? json.data : x)));
      setSelected(json.data);
      setAdjustXp("");
      setAdjustRp("");
      toast.success("Ajuste aplicado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Usuarios</h1>
      </div>

      <Input
        wrapperClassName="mb-4 max-w-sm"
        placeholder="Buscar por nombre o email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Ningún usuario coincide.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => {
            const rank = currentRank(u.rp, ranks);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => openDetail(u)}
                className="surface-parchment p-4 flex items-center justify-between gap-3 text-left w-full"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserCircle size={28} className="text-leather-light shrink-0" />
                  <div className="min-w-0">
                    <p className="font-label text-sm font-bold text-ink truncate">{u.name || u.email}</p>
                    <p className="font-body text-xs text-ink-light truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.is_subscriber && (
                    <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-brass/15 text-brass">
                      Suscriptor
                    </span>
                  )}
                  <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-leather/10 text-leather">
                    Nv. {levelForXp(u.xp)}
                  </span>
                  {rank && (
                    <span className="font-label text-2xs uppercase tracking-wide px-2 py-0.5 rounded-sm bg-moss/15 text-moss-dark">
                      {rank.name}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || selected?.email || "Usuario"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="font-body text-sm text-ink flex flex-col gap-1">
              <div><span className="text-ink-light">Email:</span> {selected.email}</div>
              <div><span className="text-ink-light">Nivel:</span> {levelForXp(selected.xp)} ({selected.xp} XP)</div>
              <div>
                <span className="text-ink-light">Rango:</span>{" "}
                {currentRank(selected.rp, ranks)?.name ?? "Sin rango"} ({selected.rp} RP)
              </div>
            </div>

            <Button size="sm" variant={selected.is_subscriber ? "danger" : "secondary"} onClick={() => toggleSubscriber(selected)}>
              {selected.is_subscriber ? "Desactivar suscripción" : "Activar suscripción"}
            </Button>

            <form onSubmit={applyAdjustment} className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">
                Ajuste manual (corrección)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ajustar XP" type="number" placeholder="ej: 10 o -10" value={adjustXp} onChange={(e) => setAdjustXp(e.target.value)} />
                <Input label="Ajustar RP" type="number" placeholder="ej: 2 o -2" value={adjustRp} onChange={(e) => setAdjustRp(e.target.value)} />
              </div>
              <Button type="submit" size="sm" loading={saving}>Aplicar ajuste</Button>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
