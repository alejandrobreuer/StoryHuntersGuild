"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import type { ShgSetting } from "@/types/database";

export function SettingsForm() {
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((json) => {
      const settings = (json.data ?? []) as ShgSetting[];
      setValue(settings.find((s) => s.key === "bank_transfer_instructions")?.value ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "bank_transfer_instructions", value }),
      });
      if (!res.ok) { toast.error("No se pudo guardar."); return; }
      toast.success("Guardado.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Configuración</h1>
      <form onSubmit={handleSave} className="surface-parchment p-6 flex flex-col gap-4 max-w-lg">
        <Textarea
          label="Datos de transferencia bancaria"
          helperText="Se muestra en la página de reserva de cada evento."
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" loading={saving}>Guardar</Button>
      </form>
    </div>
  );
}
