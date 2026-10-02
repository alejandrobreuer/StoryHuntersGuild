"use client";

import * as React from "react";
import Image from "next/image";
import { Dice5, FileText, FileX2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

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

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Reglas</h1>

      <p className="font-body text-sm text-parchment-dark mb-4">
        Reglamentos completos en PDF, para consultar sin tener que buscarlos por fuera. No es el
        resumen corto que ven los jugadores en la Ludoteca — es el manual original del juego.
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
          {filtered.map((g) => (
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

              {g.hasPdf ? (
                <button
                  type="button"
                  onClick={() => setViewing(g)}
                  className="flex items-center gap-1.5 shrink-0 font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm border border-crimson text-crimson hover:bg-crimson/10 transition-colors"
                >
                  <FileText size={13} /> Ver reglas
                </button>
              ) : (
                <span className="flex items-center gap-1.5 shrink-0 font-label text-2xs uppercase tracking-wide px-3 py-1.5 rounded-sm text-leather-light">
                  <FileX2 size={13} /> Sin PDF
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Reglas — ${viewing.name}` : ""}
        className="max-w-5xl w-[92vw] h-[90vh] flex flex-col"
      >
        {viewing && (
          <iframe
            src={`/rules/${viewing.id}.pdf`}
            title={`Reglas de ${viewing.name}`}
            className="flex-1 w-full border border-border"
          />
        )}
      </Modal>
    </div>
  );
}
