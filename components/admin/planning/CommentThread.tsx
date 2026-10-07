"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import { AssigneeAvatar } from "@/components/admin/planning/AssigneeAvatar";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export interface PlanningComment {
  id:         string;
  author:     { id: string; name: string } | null;
  body:       string;
  created_at: string;
  updated_at: string;
}

interface CommentThreadProps {
  comments:        PlanningComment[];
  currentUserId:   string;
  canDeleteAny:    boolean;
  onAdd:           (body: string) => Promise<void>;
  onEdit:          (id: string, body: string) => Promise<void>;
  onDelete:        (id: string) => void;
}

export function CommentThread({ comments, currentUserId, canDeleteAny, onAdd, onEdit, onDelete }: CommentThreadProps) {
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState("");

  async function handlePost() {
    if (!draft.trim()) return;
    setPosting(true);
    try { await onAdd(draft.trim()); setDraft(""); }
    finally { setPosting(false); }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <h3 className="font-label text-sm font-semibold uppercase tracking-widest text-leather-light">
        Comentarios · {comments.length}
      </h3>

      {comments.map((c) => {
        const canEdit = c.author?.id === currentUserId;
        const canDelete = canEdit || canDeleteAny;
        const edited = c.updated_at > c.created_at;
        return (
          <div key={c.id} className="flex gap-2.5">
            <AssigneeAvatar name={c.author?.name ?? "Usuario eliminado"} size="md" />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 font-label text-xs text-leather-light">
                <strong className="text-ink font-semibold">{c.author?.name ?? "Usuario eliminado"}</strong>
                · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                {edited && <span className="italic">· editado</span>}
              </div>
              {editingId === c.id ? (
                <div className="flex flex-col gap-1.5">
                  <Textarea rows={2} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => { await onEdit(c.id, editDraft); setEditingId(null); }}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <p className="font-body text-base text-ink whitespace-pre-wrap">{c.body}</p>
              )}
              {editingId !== c.id && (canEdit || canDelete) && (
                <div className="flex gap-3">
                  {canEdit && (
                    <button type="button" onClick={() => { setEditingId(c.id); setEditDraft(c.body); }} className="flex items-center gap-1 text-2xs text-leather-light hover:text-brass">
                      <Edit2 size={11} /> Editar
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" onClick={() => onDelete(c.id)} className="flex items-center gap-1 text-2xs text-leather-light hover:text-crimson">
                      <Trash2 size={11} /> Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          placeholder="Escribí un comentario… (Ctrl+Enter para publicar)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handlePost(); } }}
        />
        <div className="flex justify-end">
          <Button size="sm" loading={posting} disabled={!draft.trim()} onClick={handlePost}>Publicar</Button>
        </div>
      </div>
    </div>
  );
}
