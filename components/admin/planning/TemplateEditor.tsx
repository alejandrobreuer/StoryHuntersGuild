"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Row {
  _key: string;
  id?: string;
  title: string;
  description: string;
  due_offset_days: string; // kept as string for the controlled number input, parsed on save
}

function newRow(): Row {
  return { _key: crypto.randomUUID(), title: "", description: "", due_offset_days: "" };
}

export function TemplateEditor({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/planning/templates/${templateId}`);
      const json = await res.json();
      setName(json.data?.name ?? "");
      setDescription(json.data?.description ?? "");
      setRows(
        (json.data?.tasks ?? []).map((t: { id: string; title: string; description: string | null; due_offset_days: number | null }) => ({
          _key: crypto.randomUUID(),
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          due_offset_days: t.due_offset_days === null ? "" : String(t.due_offset_days),
        }))
      );
      setLoading(false);
    })();
  }, [templateId]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r._key !== key));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const from = rs.findIndex((r) => r._key === active.id);
      const to = rs.findIndex((r) => r._key === over.id);
      if (from === -1 || to === -1) return rs;
      return arrayMove(rs, from, to);
    });
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("La plantilla necesita un nombre."); return; }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description || null,
        tasks: rows
          .filter((r) => r.title.trim())
          .map((r) => ({
            ...(r.id ? { id: r.id } : {}),
            title: r.title.trim(),
            description: r.description || null,
            due_offset_days: r.due_offset_days.trim() === "" ? null : Number(r.due_offset_days),
          })),
      };
      const res = await fetch(`/api/admin/planning/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo guardar."); return; }
      toast.success("Plantilla guardada.");
      router.push("/admin/planning/templates");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <h1 className="font-display text-2xl text-parchment">Editar plantilla</h1>

      <div className="surface-parchment p-5 flex flex-col gap-3.5">
        <Input label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Descripción (opcional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="font-label text-sm font-semibold text-parchment uppercase tracking-widest">Tareas · {rows.length}</p>
          <Button size="sm" variant="secondary" type="button" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <Plus size={14} className="mr-1" />Agregar tarea
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="font-body italic text-parchment-dark">Todavía no hay tareas en esta plantilla.</p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r._key)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <TemplateTaskRow key={row._key} row={row} onChange={(patch) => updateRow(row._key, patch)} onRemove={() => removeRow(row._key)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/planning/templates")}>Cancelar</Button>
        <Button type="button" loading={saving} onClick={handleSave}>Guardar plantilla</Button>
      </div>
    </div>
  );
}

function TemplateTaskRow({ row, onChange, onRemove }: { row: Row; onChange: (patch: Partial<Row>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row._key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-start gap-2.5 p-3 surface-parchment", isDragging && "opacity-50")}
    >
      <button type="button" {...attributes} {...listeners} className="mt-2.5 text-leather-light hover:text-ink cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-2.5">
        <Input placeholder="Título de la tarea" value={row.title} onChange={(e) => onChange({ title: e.target.value })} />
        <Input
          type="number"
          min={0}
          max={365}
          placeholder="Días antes"
          value={row.due_offset_days}
          onChange={(e) => onChange({ due_offset_days: e.target.value })}
          wrapperClassName="w-32"
        />
        <Textarea
          placeholder="Descripción (opcional)"
          rows={1}
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="col-span-2"
        />
      </div>
      <button type="button" onClick={onRemove} className="mt-2.5 text-leather-light hover:text-crimson shrink-0"><Trash2 size={15} /></button>
    </div>
  );
}
