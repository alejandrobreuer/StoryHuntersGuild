"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toISODateInEventTimeZone } from "@/lib/formatting";
import { subtractDaysISO, formatPlanningDate } from "@/lib/planning/dates";
import type { ShgPlanningAssignee } from "@/types/database";

interface LinkableEvent { id: string; title: string; starts_at: string }
interface TemplateSummary { id: string; name: string; task_count: number }
interface TemplateTaskPreview { title: string; due_offset_days: number | null }

const EMPTY_FORM = { title: "", description: "", event_id: "", owner_id: "", due_date: "" };

export function NewEpicModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"blank" | "template">("blank");
  const [events, setEvents] = React.useState<LinkableEvent[]>([]);
  const [owners, setOwners] = React.useState<ShgPlanningAssignee[]>([]);
  const [templates, setTemplates] = React.useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = React.useState("");
  const [templateTasks, setTemplateTasks] = React.useState<TemplateTaskPreview[]>([]);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [titleTouched, setTitleTouched] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMode("blank");
    setForm(EMPTY_FORM);
    setTitleTouched(false);
    setTemplateId("");
    setTemplateTasks([]);
    (async () => {
      const [eventsRes, ownersRes, templatesRes] = await Promise.all([
        fetch("/api/admin/planning/linkable-events"),
        fetch("/api/admin/planning/assignable-users"),
        fetch("/api/admin/planning/templates"),
      ]);
      setEvents((await eventsRes.json()).data ?? []);
      setOwners((await ownersRes.json()).data ?? []);
      setTemplates((await templatesRes.json()).data ?? []);
    })();
  }, [open]);

  React.useEffect(() => {
    if (!templateId) { setTemplateTasks([]); return; }
    (async () => {
      const res = await fetch(`/api/admin/planning/templates/${templateId}`);
      const json = await res.json();
      setTemplateTasks((json.data?.tasks ?? []).map((t: TemplateTaskPreview) => ({ title: t.title, due_offset_days: t.due_offset_days })));
    })();
  }, [templateId]);

  function handleEventChange(eventId: string) {
    const event = events.find((e) => e.id === eventId);
    const due_date = event ? toISODateInEventTimeZone(event.starts_at) : form.due_date;
    const title = !titleTouched && event ? `${event.title} · ${formatPlanningDate(due_date)}` : form.title;
    setForm((f) => ({ ...f, event_id: eventId, due_date, title }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        event_id: form.event_id || null,
        owner_id: form.owner_id || null,
        due_date: form.due_date || null,
      };
      const res = await fetch(
        mode === "template" ? "/api/admin/planning/epics/from-template" : "/api/admin/planning/epics",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "template" ? { ...body, template_id: templateId } : body),
        }
      );
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo crear la épica."); return; }
      toast.success("Épica creada.");
      onClose();
      router.push(`/admin/planning/${json.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <Modal open={open} onClose={onClose} title="Nueva épica" className="max-w-2xl max-h-[88vh] overflow-y-auto" closeOnBackdropClick={false}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("blank")}
            className={cn(
              "flex flex-col items-start gap-1 p-4 border rounded-sm text-left transition-colors",
              mode === "blank" ? "border-2 border-crimson bg-crimson/5" : "border-border hover:border-brass"
            )}
          >
            <span className="font-label text-sm">Épica en blanco</span>
            <span className="font-body text-sm text-ink-light">Empezar sin tareas</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("template")}
            className={cn(
              "flex flex-col items-start gap-1 p-4 border rounded-sm text-left transition-colors",
              mode === "template" ? "border-2 border-crimson bg-crimson/5" : "border-border hover:border-brass"
            )}
          >
            <span className="font-label text-sm">Desde una plantilla</span>
            <span className="font-body text-sm text-ink-light">Copiar una lista guardada</span>
          </button>
        </div>

        {mode === "template" && (
          <Select label="Plantilla" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
            <option value="">Elegí una plantilla…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.task_count} tarea{t.task_count === 1 ? "" : "s"}</option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Evento vinculado (opcional)" value={form.event_id} onChange={(e) => handleEventChange(e.target.value)}>
            <option value="">Sin evento</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </Select>
          <Select label="Dueño (opcional)" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
            <option value="">Sin asignar</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </div>

        <Input
          label="Título"
          required
          value={form.title}
          onChange={(e) => { setTitleTouched(true); setForm({ ...form, title: e.target.value }); }}
        />

        <Input
          label="Fecha límite"
          type="date"
          wrapperClassName="max-w-xs"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          helperText={form.event_id ? "Tomada del evento — se puede cambiar" : undefined}
        />

        <Textarea label="Descripción" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        {mode === "template" && selectedTemplate && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <p className="font-label text-2xs font-semibold uppercase tracking-widest text-leather-light">
                Tareas a crear · {templateTasks.length}
              </p>
              {!form.due_date && <p className="font-body text-2xs text-ink-light">Sin fecha límite — las tareas no tendrán fecha</p>}
            </div>
            <div className="border border-border rounded-sm overflow-hidden max-h-56 overflow-y-auto">
              {templateTasks.map((t, i) => {
                const due = form.due_date ? subtractDaysISO(form.due_date, t.due_offset_days) : null;
                return (
                  <div key={i} className={cn("flex items-center gap-3 px-3 py-2 font-body text-sm", i > 0 && "border-t border-border/60")}>
                    <span className="flex-1 min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 font-label text-2xs text-ink-light">
                      {t.due_offset_days === null ? "Sin fecha" : `${t.due_offset_days}d antes`}
                    </span>
                    <span className="shrink-0 font-label text-xs w-14 text-right">{due ? formatPlanningDate(due) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={mode === "template" && !templateId}>Crear épica</Button>
        </div>
      </form>
    </Modal>
  );
}
