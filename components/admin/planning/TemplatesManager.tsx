"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  task_count: number;
}

export function TemplatesManager() {
  const router = useRouter();
  const [templates, setTemplates] = React.useState<TemplateSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/planning/templates");
    setTemplates((await res.json()).data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/planning/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tasks: [] }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo crear la plantilla."); return; }
      router.push(`/admin/planning/templates/${json.data.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(t: TemplateSummary) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return;
    const res = await fetch(`/api/admin/planning/templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar."); return; }
    toast.success("Plantilla eliminada.");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Plantillas</h1>
        <Button size="sm" onClick={() => { setName(""); setModalOpen(true); }}><Plus size={14} className="mr-1" />Nueva plantilla</Button>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : templates.length === 0 ? (
        <p className="font-body italic text-parchment-dark">Todavía no hay plantillas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="surface-parchment p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/planning/templates/${t.id}`} className="font-label text-sm font-bold text-ink hover:text-brass">
                  {t.name}
                </Link>
                <button onClick={() => handleDelete(t)} className="p-1 text-leather-light hover:text-crimson transition-colors"><Trash2 size={14} /></button>
              </div>
              {t.description && <p className="font-body text-sm text-ink-light line-clamp-2">{t.description}</p>}
              <p className="font-label text-2xs text-leather-light">{t.task_count} tarea{t.task_count === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva plantilla">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Button type="submit" loading={creating} className="mt-2">Crear y editar tareas</Button>
        </form>
      </Modal>
    </div>
  );
}
