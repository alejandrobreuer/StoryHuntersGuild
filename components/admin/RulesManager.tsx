"use client";

import * as React from "react";
import Image from "next/image";
import { Dice5, FileText, FileX2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { uploadRulesPdf, rulesPdfFileError } from "@/lib/rules-pdf-upload";

interface RuleGame {
  id:        string;
  name:      string;
  image_url: string | null;
  hasPdf:    boolean;
}

export function RulesManager() {
  const [games, setGames] = React.useState<RuleGame[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [viewing, setViewing] = React.useState<RuleGame | null>(null);
  const [viewUrl, setViewUrl] = React.useState<string | null>(null);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);

  // Uploaded PDFs are in a private bucket, so the viewer needs a signed URL.
  React.useEffect(() => {
    setViewUrl(null);
    if (!viewing) return;
    let cancelled = false;
    fetch(`/api/admin/games/${viewing.id}/rules-pdf`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setViewUrl(json.data?.url ?? "error"); })
      .catch(() => { if (!cancelled) setViewUrl("error"); });
    return () => { cancelled = true; };
  }, [viewing]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/rules");
      const json = await res.json();
      setGames(json.data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, query]);

  async function handleUpload(game: RuleGame, file: File) {
    const fileError = rulesPdfFileError(file);
    if (fileError) { toast.error(fileError); return; }
    setUploadingId(game.id);
    try {
      const uploadError = await uploadRulesPdf(game.id, file);
      if (uploadError) { toast.error(uploadError); return; }
      setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, hasPdf: true } : g)));
      toast.success(`Reglamento de ${game.name} ${game.hasPdf ? "reemplazado" : "subido"}.`);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Reglas</h1>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Reglamentos completos en PDF, para consultar sin tener que buscarlos por fuera. No es el
        resumen corto que ven los jugadores en la Ludoteca — es el manual original del juego. Podés
        subir o reemplazar el PDF de cada juego desde acá (solo PDF, hasta 50 MB).
      </p>

      <Input
        wrapperClassName="mb-4 max-w-md"
        label="Buscar juego"
        placeholder="Ej: Catan…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="font-body italic text-parchment-dark">No encontramos juegos con ese nombre.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((g) => {
            const isUploading = uploadingId === g.id;
            return (
              <div key={g.id} className="surface-parchment p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative size-10 shrink-0 bg-parchment-dark/40 border border-border rounded-sm overflow-hidden">
                    {g.image_url ? (
                      <Image src={g.image_url} alt="" fill className="object-cover" sizes="40px" />
                    ) : (
                      <Dice5 size={16} className="absolute inset-0 m-auto text-leather-light" />
                    )}
                  </div>
                  <p className="font-label text-sm font-bold text-ink truncate">{g.name}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {g.hasPdf ? (
                    <button
                      type="button"
                      onClick={() => setViewing(g)}
                      className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-crimson text-crimson hover:bg-crimson/10 transition-colors"
                    >
                      <FileText size={13} /> Ver reglas
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm text-leather-light">
                      <FileX2 size={13} /> Sin PDF
                    </span>
                  )}
                  <label
                    className={
                      "flex items-center gap-1.5 font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-border text-ink-light transition-colors " +
                      (uploadingId ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-brass hover:text-ink")
                    }
                  >
                    <Upload size={13} />
                    {isUploading ? "Subiendo…" : g.hasPdf ? "Reemplazar" : "Subir PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={Boolean(uploadingId)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) handleUpload(g, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Reglas — ${viewing.name}` : ""}
        className="max-w-none w-[99vw] h-[98vh] max-h-[98vh]"
        bodyClassName="p-3 flex flex-col"
        titleClassName="text-sm"
      >
        {viewing && !viewUrl && <p className="font-body italic text-ink-light">Cargando…</p>}
        {viewing && viewUrl === "error" && <p className="font-body italic text-crimson">No se pudo abrir el PDF.</p>}
        {viewing && viewUrl && viewUrl !== "error" && (
          <iframe
            src={viewUrl}
            title={`Reglas de ${viewing.name}`}
            className="flex-1 w-full border border-border"
          />
        )}
      </Modal>
    </div>
  );
}
