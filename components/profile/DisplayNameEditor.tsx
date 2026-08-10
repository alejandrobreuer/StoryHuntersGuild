"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

export function DisplayNameEditor({ currentName, fallback }: { currentName: string | null; fallback: string }) {
  const [name, setName] = React.useState(currentName);
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(currentName ?? "");
  const [saving, setSaving] = React.useState(false);

  function openModal() {
    setValue(name ?? "");
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/set-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al guardar el nombre."); return; }
      setName(json.data.name);
      toast.success("Nombre actualizado.");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <h1 className="font-display font-semibold text-2xl sm:text-[32px] text-[#3B2A1E] leading-snug">
          {name || fallback}
        </h1>
        <button
          type="button"
          onClick={openModal}
          aria-label="Cambiar nombre para mostrar"
          className="shrink-0 text-[#7A5433] hover:text-[#A6772F] transition-colors"
        >
          <Pencil size={15} />
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Cambiar nombre para mostrar">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Input
            label="Nombre para mostrar"
            required
            maxLength={40}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Solo letras y espacios"
            helperText="Se muestra en tu perfil y en el gremio. Solo letras, sin números ni símbolos, y debe ser único."
          />
          <Button type="submit" loading={saving} className="mt-1">Guardar</Button>
        </form>
      </Modal>
    </>
  );
}
