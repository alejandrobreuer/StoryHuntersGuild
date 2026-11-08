"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import { LOW_AVAILABILITY_SETTING_KEY, parseLowAvailabilityThreshold } from "@/lib/availability";
import type { ShgSetting } from "@/types/database";

export function SettingsForm() {
  const [value, setValue] = React.useState("");
  const [threshold, setThreshold] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((json) => {
      const settings = (json.data ?? []) as ShgSetting[];
      setValue(settings.find((s) => s.key === "bank_transfer_instructions")?.value ?? "");
      setThreshold(String(parseLowAvailabilityThreshold(settings.find((s) => s.key === LOW_AVAILABILITY_SETTING_KEY)?.value)));
      setLoading(false);
    });
  }, []);

  async function saveSetting(key: string, val: string) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: val }),
    });
    return res.ok;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(threshold, 10);
    if (!Number.isFinite(n) || n < 0) { toast.error("El umbral de disponibilidad baja tiene que ser un número entero ≥ 0."); return; }
    setSaving(true);
    try {
      const results = await Promise.all([
        saveSetting("bank_transfer_instructions", value),
        saveSetting(LOW_AVAILABILITY_SETTING_KEY, String(n)),
      ]);
      if (results.some((ok) => !ok)) { toast.error("No se pudo guardar."); return; }
      toast.success("Guardado.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div>
      <form onSubmit={handleSave} className="surface-parchment p-6 flex flex-col gap-4 max-w-lg">
        <Textarea
          label="Datos de transferencia bancaria"
          helperText="Se muestra en la página de reserva de cada evento."
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Input
          label="Umbral de disponibilidad baja"
          helperText="Si quedan esta cantidad de lugares o menos, la página del evento muestra «Disponibilidad baja»."
          type="number"
          min={0}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <Button type="submit" loading={saving}>Guardar</Button>
      </form>
    </div>
  );
}
