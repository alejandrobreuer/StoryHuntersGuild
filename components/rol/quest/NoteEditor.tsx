"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";

// One free-text document per thread — not a message list. Typing + Save
// overwrites the document in place (see the notes API routes).
export function NoteEditor({
  label, initialContent, onSave, readOnly, placeholder,
}: {
  label: string;
  initialContent: string;
  onSave?: (content: string) => Promise<boolean>;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const [content, setContent] = React.useState(initialContent);
  const [saving, setSaving] = React.useState(false);
  const dirty = content !== initialContent;

  React.useEffect(() => { setContent(initialContent); }, [initialContent]);

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      const ok = await onSave(content);
      if (ok) toast.success("Nota guardada.");
      else toast.error("No se pudo guardar la nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1.5">{label}</p>
      <Textarea
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder ?? (readOnly ? "Sin notas todavía." : "Escribí acá…")}
      />
      {!readOnly && (
        <Button size="sm" className="mt-2" onClick={handleSave} loading={saving} disabled={!dirty}>Guardar</Button>
      )}
    </div>
  );
}
