"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import type { ShgRolGuild, ShgRolGuildStatus } from "@/types/database";

export function GuildIdentityForm({ refreshKey }: { refreshKey?: number } = {}) {
  const [guild, setGuild] = React.useState<ShgRolGuild | null>(null);
  const [statuses, setStatuses] = React.useState<ShgRolGuildStatus[]>([]);
  const [form, setForm] = React.useState({ name: "", image_url: "", description: "", supplies: "0", current_guild_status_id: "" });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [guildRes, statusRes] = await Promise.all([
      fetch("/api/admin/rol/guild"),
      fetch("/api/admin/rol/guild-statuses"),
    ]);
    const guildJson = await guildRes.json();
    setStatuses((await statusRes.json()).data ?? []);
    if (guildJson.data) {
      setGuild(guildJson.data);
      setForm({
        name: guildJson.data.name, image_url: guildJson.data.image_url ?? "",
        description: guildJson.data.description ?? "", supplies: String(guildJson.data.supplies),
        current_guild_status_id: guildJson.data.current_guild_status_id ?? "",
      });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load, refreshKey]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al subir imagen."); return; }
      setForm((f) => ({ ...f, image_url: json.data.url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rol/guild", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, image_url: form.image_url, description: form.description,
          supplies: Number(form.supplies) || 0,
          current_guild_status_id: form.current_guild_status_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar."); return; }
      toast.success("Gremio actualizado.");
      setGuild(json.data);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;
  if (!guild) return <p className="font-body italic text-parchment-dark">El gremio no fue inicializado.</p>;

  return (
    <form onSubmit={handleSave} className="surface-parchment p-5 flex flex-col gap-3">
      <h2 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-1">Identidad del gremio</h2>
      <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Textarea
        label="Descripción / novedades"
        rows={4}
        placeholder="¿Qué está haciendo el gremio? Últimas novedades, avisos, rumores…"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <Input
        label="Suministros"
        type="number"
        min={0}
        value={form.supplies}
        onChange={(e) => setForm({ ...form, supplies: e.target.value })}
      />
      <Select
        label="Estado del gremio"
        value={form.current_guild_status_id}
        onChange={(e) => setForm({ ...form, current_guild_status_id: e.target.value })}
      >
        <option value="">Ninguno</option>
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <div className="flex flex-col gap-1.5">
        <label className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">Imagen del gremio</label>
        <div className="flex items-center gap-3">
          <div className="relative size-16 shrink-0 bg-parchment-dark/40 border border-brass/30 flex items-center justify-center overflow-hidden">
            {form.image_url ? (
              <Image src={form.image_url} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <Shield size={20} className="text-leather-light" />
            )}
          </div>
          <label className="flex items-center gap-2 border border-dashed border-border px-3 py-2.5 cursor-pointer hover:border-brass transition-colors text-sm font-body text-ink-light flex-1">
            <Upload size={15} />
            {uploading ? "Subiendo…" : form.image_url ? "Cambiar imagen" : "Subir imagen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </label>
        </div>
      </div>
      <Button type="submit" loading={saving} className="mt-2 self-start">Guardar</Button>
    </form>
  );
}
