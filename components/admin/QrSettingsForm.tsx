"use client";

import * as React from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/formatting";
import { SAMPLE_TEMPLATE_URL } from "@/lib/qr/template";
import { toast } from "sonner";

// Settings → "Códigos QR": scan windows + the printable mission-card template.

interface QrSettings {
  claimsOpenBefore: number; claimsCloseAfter: number; checkinOpenBefore: number;
  template: { name: string; uploadedAt: string } | null;
}

const PLACEHOLDERS: [string, string][] = [
  ["{mission_title}", "Nombre de la misión (obligatorio)"],
  ["{mission_description}", "Descripción (se corta a ~180 caracteres)"],
  ["{mission_type}", "Individual / Grupo / Evento"],
  ["{difficulty}", "Baja / Media / Alta"],
  ["{game}", "Juego de la misión"],
  ["{event_name} · {event_date}", "Nombre y fecha del evento"],
  ["{mission_url}", "Enlace en texto, por si la cámara no lee el QR"],
  ["{qr_code}", "Texto alternativo de una imagen: se reemplaza por el QR (obligatorio)"],
  ["{#missions} … {/missions}", "Repite la tarjeta por cada misión"],
];

export function QrSettingsForm() {
  const [settings, setSettings] = React.useState<QrSettings | null>(null);
  const [form, setForm] = React.useState({ claimsOpenBefore: "0", claimsCloseAfter: "60", checkinOpenBefore: "60" });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/settings/qr");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error ?? "No se pudo cargar."); return; }
    const s = json.data as QrSettings;
    setSettings(s);
    setForm({
      claimsOpenBefore: String(s.claimsOpenBefore), claimsCloseAfter: String(s.claimsCloseAfter),
      checkinOpenBefore: String(s.checkinOpenBefore),
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimsOpenBefore: Number(form.claimsOpenBefore), claimsCloseAfter: Number(form.claimsCloseAfter),
          checkinOpenBefore: Number(form.checkinOpenBefore),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
      toast.success("Guardado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/settings/qr/template", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "No se pudo subir la plantilla.", { duration: 8000 }); return; }
      toast.success("Plantilla cargada.");
      await load();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("¿Quitar la plantilla de tarjetas? \"Imprimir tarjetas\" deja de estar disponible hasta que subas otra.")) return;
    const res = await fetch("/api/admin/settings/qr/template", { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo quitar."); return; }
    toast.success("Plantilla quitada.");
    await load();
  }

  if (!settings) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form onSubmit={handleSave} className="surface-parchment p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-label text-sm font-bold text-ink">Ventanas de escaneo</h2>
          <p className="font-body text-xs text-ink-light mt-1">
            Se calculan con el horario programado de cada evento (inicio y fin), no con los botones Iniciar/Finalizar.
            Un evento sin hora de fin se toma como de 12 horas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="number" min={0} max={1440} label="Misiones abren antes (min)" required
            helperText="0 = desde el inicio del evento" value={form.claimsOpenBefore} onChange={set("claimsOpenBefore")}
          />
          <Input
            type="number" min={0} max={1440} label="Misiones cierran después (min)" required
            helperText="Margen tras el fin del evento" value={form.claimsCloseAfter} onChange={set("claimsCloseAfter")}
          />
          <Input
            type="number" min={0} max={1440} label="Check-in abre antes (min)" required
            helperText="Cierra junto con las misiones" value={form.checkinOpenBefore} onChange={set("checkinOpenBefore")}
          />
        </div>
        <Button type="submit" loading={saving} className="self-start">Guardar</Button>
      </form>

      <div className="surface-parchment p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-label text-sm font-bold text-ink">Plantilla de tarjetas de misión</h2>
          <p className="font-body text-xs text-ink-light mt-1">
            Diseñá la tarjeta en Word con estas etiquetas y subila acá. &quot;Imprimir tarjetas&quot; (en los Códigos QR de cada evento)
            genera un .docx con una tarjeta por misión, listo para imprimir.
          </p>
        </div>

        {settings.template ? (
          <div className="flex items-center gap-3 border border-border bg-parchment/60 px-3 py-2.5">
            <FileText size={18} className="text-brass shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm text-ink truncate">{settings.template.name}</p>
              <p className="font-body text-2xs text-ink-light">Subida el {formatDateTime(settings.template.uploadedAt)}</p>
            </div>
            <button type="button" onClick={handleRemove} title="Quitar plantilla" className="p-1.5 text-leather-light hover:text-crimson">
              <Trash2 size={15} />
            </button>
          </div>
        ) : (
          <p className="font-body text-sm italic text-ink-light">Todavía no hay plantilla cargada.</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInput} type="file" className="hidden"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
          <Button size="sm" loading={uploading} onClick={() => fileInput.current?.click()}>
            <Upload size={13} className="mr-1" />{settings.template ? "Reemplazar" : "Subir plantilla"}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={SAMPLE_TEMPLATE_URL} download><Download size={13} className="mr-1" />Descargar plantilla de ejemplo</a>
          </Button>
        </div>

        <table className="w-full font-body text-xs">
          <tbody>
            {PLACEHOLDERS.map(([tag, desc]) => (
              <tr key={tag} className="border-t border-border">
                <td className="py-1.5 pr-3 font-mono text-2xs text-ink whitespace-nowrap align-top">{tag}</td>
                <td className="py-1.5 text-ink-light">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-body text-2xs text-ink-light">
          Para varias tarjetas por hoja, cada tarjeta es una fila de tabla más una fila separadora: {"{#missions}"} va en la celda izquierda
          de la tarjeta y {"{/missions}"} en la celda derecha de la fila separadora. La plantilla de ejemplo ya viene armada así.
        </p>
      </div>
    </div>
  );
}
