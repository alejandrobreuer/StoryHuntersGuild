"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, Copy, Download, Maximize2, RefreshCw, Printer, Archive, X, UserMinus, Send, Power, DoorOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatTime } from "@/lib/formatting";
import { DIFFICULTY_LABELS } from "@/lib/gamification/questDifficulty";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { QuestDifficulty, QuestType, QuestGroupStatus } from "@/types/database";

// Admin → Eventos → (QR icon). One page per event: the entrance check-in
// code, one code per attached mission, the QR parties waiting to be closed
// (Group missions), and a live feed of scans for the host's phone.

interface CodeRow {
  id: string; active: boolean; rotated_at: string | null; url: string; svg: string;
  quest: { id: string; title: string; type: QuestType; difficulty: QuestDifficulty };
}
interface UserInfo { id: string; email: string; name: string | null; }
interface PartyRow {
  id: string; quest_id: string; status: QuestGroupStatus; source: "manual" | "qr"; created_at: string;
  members: { user_id: string; joined_at: string; user: UserInfo | UserInfo[] | null }[];
}
interface QrData {
  event: { id: string; title: string; slug: string; starts_at: string; ends_at: string | null };
  checkin: { active: boolean; url: string; svg: string };
  codes: CodeRow[];
  parties: PartyRow[];
  windows: { claimsOpenAt: string; claimsCloseAt: string; checkinOpenAt: string };
  templateUploaded: boolean;
}
interface FeedItem { id: string; at: string; player: string; mission: string; kind: "turn_in" | "party_join"; status: string; }

const TYPE_LABELS: Record<QuestType, string> = { individual: "Individual", group: "Grupo", event: "Evento", guild: "Gremio" };
const FEED_POLL_MS = 10_000;

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EventQrManager({ eventId }: { eventId: string }) {
  const [data, setData] = React.useState<QrData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [fullscreen, setFullscreen] = React.useState<{ title: string; svg: string; url: string } | null>(null);
  const [printing, setPrinting] = React.useState(false);

  const base = `/api/admin/events/${eventId}/qr`;

  const load = React.useCallback(async () => {
    const res = await fetch(base);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setLoadError(json.error ?? "No se pudieron cargar los códigos."); return; }
    setData(json.data);
  }, [base]);

  React.useEffect(() => { load(); }, [load]);

  async function patch(key: string, url: string, body: object, successMsg: string) {
    setBusy(key);
    try {
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Ocurrió un error."); return; }
      toast.success(successMsg);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function regenerate(key: string, url: string, label: string) {
    if (!confirm(`¿Regenerar el código de "${label}"?\n\nEl QR impreso actual deja de funcionar inmediatamente y vas a tener que reimprimirlo.`)) return;
    patch(key, url, { regenerate: true }, "Código regenerado. Reimprimí la tarjeta.");
  }

  async function postAction(key: string, url: string, method: "POST" | "DELETE", successMsg: string) {
    setBusy(key);
    try {
      const res = await fetch(url, { method });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Ocurrió un error."); return; }
      toast.success(successMsg);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function printCards() {
    if (!data?.templateUploaded) {
      toast.error("Primero subí una plantilla de tarjetas en Configuración → Códigos QR.");
      return;
    }
    setPrinting(true);
    try {
      const res = await fetch(`${base}/cards`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "No se pudieron generar las tarjetas.");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${data.event.slug}_tarjetas.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setPrinting(false);
    }
  }

  if (loadError) return <p className="font-body italic text-crimson">{loadError}</p>;
  if (!data) return <p className="font-body italic text-parchment-dark">Cargando…</p>;

  const questTitle = new Map(data.codes.map((c) => [c.quest.id, c.quest.title]));
  const openParties = data.parties;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/events" className="inline-flex items-center gap-1 font-label text-2xs uppercase tracking-widest text-parchment-dark hover:text-brass mb-3">
          <ArrowLeft size={12} /> Eventos
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-parchment">Códigos QR</h1>
            <p className="font-body text-sm text-parchment-dark">{data.event.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild size="sm" variant="ghost">
              <a href={`${base}/zip`} download><Archive size={13} className="mr-1" />Descargar todo (ZIP)</a>
            </Button>
            <Button size="sm" onClick={printCards} loading={printing}>
              <Printer size={13} className="mr-1" />Imprimir tarjetas
            </Button>
          </div>
        </div>
        <p className="font-body text-xs text-parchment-dark mt-2">
          Check-in desde {formatDateTime(data.windows.checkinOpenAt)} · Misiones desde {formatDateTime(data.windows.claimsOpenAt)}{" "}
          hasta {formatDateTime(data.windows.claimsCloseAt)}. Las ventanas se ajustan en Configuración → Códigos QR.
        </p>
        {!data.templateUploaded && (
          <p className="font-body text-xs text-brass mt-1">
            Para imprimir tarjetas, subí una plantilla .docx en Configuración → Códigos QR. Mientras tanto, podés descargar los QR sueltos.
          </p>
        )}
      </div>

      {/* ── Check-in ── */}
      <section>
        <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-parchment-dark mb-2 flex items-center gap-1.5">
          <DoorOpen size={13} /> Check-in del evento
        </h2>
        <CodeCard
          title="Check-in"
          subtitle="Mostralo en la entrada: registra la asistencia y deja a cada jugador con la sesión iniciada."
          svg={data.checkin.svg}
          url={data.checkin.url}
          active={data.checkin.active}
          busy={busy === "checkin"}
          downloadBase={`${base}/download?target=checkin`}
          onToggle={() => patch("checkin", `${base}/checkin`, { active: !data.checkin.active }, data.checkin.active ? "Check-in desactivado." : "Check-in activado.")}
          onRegenerate={() => regenerate("checkin", `${base}/checkin`, "Check-in")}
          onView={() => setFullscreen({ title: `Check-in — ${data.event.title}`, svg: data.checkin.svg, url: data.checkin.url })}
        />
      </section>

      {/* ── Missions ── */}
      <section>
        <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-parchment-dark mb-2">
          Misiones ({data.codes.length})
        </h2>
        {data.codes.length === 0 ? (
          <p className="font-body italic text-parchment-dark text-sm">
            Este evento no tiene misiones asignadas. Asignalas al editar el evento y sus códigos se crean solos.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.codes.map((c) => (
              <CodeCard
                key={c.id}
                title={c.quest.title}
                badges={[TYPE_LABELS[c.quest.type], DIFFICULTY_LABELS[c.quest.difficulty]]}
                subtitle={c.quest.type === "group" ? "Toda la mesa escanea la misma tarjeta y se suma a un grupo; vos lo cerrás abajo." : undefined}
                svg={c.svg}
                url={c.url}
                active={c.active}
                busy={busy === c.id}
                downloadBase={`${base}/download?target=${c.id}`}
                onToggle={() => patch(c.id, `${base}/codes/${c.id}`, { active: !c.active }, c.active ? "Código desactivado." : "Código activado.")}
                onRegenerate={() => regenerate(c.id, `${base}/codes/${c.id}`, c.quest.title)}
                onView={() => setFullscreen({ title: c.quest.title, svg: c.svg, url: c.url })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Group parties ── */}
      {data.codes.some((c) => c.quest.type === "group") && (
        <section>
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-parchment-dark mb-1">Grupos abiertos</h2>
          <p className="font-body text-xs text-parchment-dark mb-2">
            Cuando la mesa termina, cerrá su grupo: pasa a Aprobaciones de entregas, donde lo confirmás para todos.
          </p>
          {openParties.length === 0 ? (
            <p className="font-body italic text-parchment-dark text-sm">No hay grupos abiertos.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {openParties.map((p) => (
                <div key={p.id} className="surface-parchment p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-label text-sm font-bold text-ink">{questTitle.get(p.quest_id) ?? "Misión"}</p>
                      {p.source === "qr" && <QrTag />}
                      <span className="font-body text-2xs text-ink-light">
                        {p.status === "started" ? "En curso" : "Formándose"} · desde {formatTime(p.created_at)}
                      </span>
                    </div>
                    <Button
                      size="sm" variant="secondary" loading={busy === p.id}
                      onClick={() => postAction(p.id, `${base}/groups/${p.id}/close`, "POST", "Grupo enviado a aprobación.")}
                    >
                      <Send size={12} className="mr-1" />Cerrar y enviar a aprobación
                    </Button>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {p.members.map((m) => {
                      const u = one(m.user);
                      return (
                        <li key={m.user_id} className="inline-flex items-center gap-1 font-body text-xs bg-leather/10 text-ink px-2 py-0.5 rounded-sm">
                          {u?.name || u?.email || "—"}
                          <button
                            type="button"
                            title="Quitar del grupo"
                            disabled={busy === `${p.id}:${m.user_id}`}
                            onClick={() => {
                              if (!confirm(`¿Quitar a ${u?.name || u?.email} de este grupo? Puede volver a escanear la tarjeta.`)) return;
                              postAction(`${p.id}:${m.user_id}`, `${base}/groups/${p.id}/members/${m.user_id}`, "DELETE", "Integrante quitado.");
                            }}
                            className="text-leather-light hover:text-crimson disabled:opacity-50"
                          >
                            <UserMinus size={12} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ClaimsFeed feedUrl={`${base}/feed`} onActivity={load} />

      {fullscreen && <FullscreenQr {...fullscreen} onClose={() => setFullscreen(null)} />}
    </div>
  );
}

function QrTag() {
  return <span className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-brass/15 text-brass">QR</span>;
}

function CodeCard({
  title, subtitle, badges, svg, url, active, busy, downloadBase, onToggle, onRegenerate, onView,
}: {
  title: string; subtitle?: string; badges?: string[]; svg: string; url: string; active: boolean; busy: boolean;
  downloadBase: string; onToggle: () => void; onRegenerate: () => void; onView: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <div className={cn("surface-parchment p-4 flex gap-4 items-start", !active && "opacity-70")}>
      <button
        type="button" onClick={onView} title="Ver en pantalla completa"
        className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-white border border-border p-1 [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-label text-sm font-bold text-ink">{title}</p>
          {badges?.map((b) => (
            <span key={b} className="font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-leather/10 text-leather">{b}</span>
          ))}
          <span className={cn(
            "font-label text-2xs uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
            active ? "bg-moss/15 text-moss" : "bg-crimson/10 text-crimson"
          )}>
            {active ? "Activo" : "Inactivo"}
          </span>
        </div>
        {subtitle && <p className="font-body text-xs text-ink-light">{subtitle}</p>}
        <div className="flex items-center gap-1.5 min-w-0">
          <code className="font-mono text-2xs text-ink-light truncate">{url}</code>
          <button type="button" onClick={copy} title="Copiar enlace" className="shrink-0 p-1 text-leather-light hover:text-brass">
            <Copy size={12} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Button size="sm" variant="ghost" onClick={onView}><Maximize2 size={12} className="mr-1" />Ver</Button>
          <Button asChild size="sm" variant="ghost">
            <a href={`${downloadBase}&format=png`} download><Download size={12} className="mr-1" />PNG</a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <a href={`${downloadBase}&format=svg`} download><Download size={12} className="mr-1" />SVG</a>
          </Button>
          <Button size="sm" variant="ghost" loading={busy} onClick={onToggle}>
            <Power size={12} className="mr-1" />{active ? "Desactivar" : "Activar"}
          </Button>
          <Button size="sm" variant="danger" loading={busy} onClick={onRegenerate}>
            <RefreshCw size={12} className="mr-1" />Regenerar
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Plain white, full-screen QR for showing on a phone or tablet when a card is lost. */
function FullscreenQr({ title, svg, url, onClose }: { title: string; svg: string; url: string; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = original; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-6" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-black">
        <X size={28} />
      </button>
      <p className="font-label text-lg font-bold text-black mb-4 text-center">{title}</p>
      <div
        className="w-[min(85vw,75vh)] aspect-square [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="font-mono text-xs text-neutral-500 mt-4 break-all text-center">{url}</p>
    </div>
  );
}

function ClaimsFeed({ feedUrl, onActivity }: { feedUrl: string; onActivity: () => void }) {
  const [items, setItems] = React.useState<FeedItem[] | null>(null);
  const [checkins, setCheckins] = React.useState(0);
  const lastTop = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(feedUrl);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const next = (json.data?.items ?? []) as FeedItem[];
        setItems(next);
        setCheckins(json.data?.checkins ?? 0);
        // New party joins change the "Grupos abiertos" list above — refresh it.
        const top = next[0]?.id ?? null;
        if (lastTop.current !== null && top !== lastTop.current && next[0]?.kind === "party_join") onActivity();
        lastTop.current = top;
      } catch {
        // Transient network blip on the host's phone — the next poll retries.
      }
    }
    poll();
    const timer = setInterval(() => { if (document.visibilityState === "visible") poll(); }, FEED_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [feedUrl, onActivity]);

  return (
    <section>
      <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-parchment-dark mb-1">
        Escaneos en vivo
      </h2>
      <p className="font-body text-xs text-parchment-dark mb-2">
        {checkins} {checkins === 1 ? "jugador hizo" : "jugadores hicieron"} check-in · se actualiza cada {FEED_POLL_MS / 1000} s ·
        las entregas se aprueban en{" "}
        <Link href="/admin/turn-ins" className="underline text-brass">Aprobaciones de entregas</Link>.
      </p>
      {items === null ? (
        <p className="font-body italic text-parchment-dark text-sm">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="font-body italic text-parchment-dark text-sm">Todavía nadie escaneó una misión.</p>
      ) : (
        <ul className="surface-parchment divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="px-4 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-body text-sm text-ink truncate"><strong>{i.player}</strong> · {i.mission}</p>
                <p className="font-body text-2xs text-ink-light">
                  {i.kind === "party_join" ? "Se sumó al grupo" : "Entrega"} · {feedStatusLabel(i)}
                </p>
              </div>
              <span className="font-body text-2xs text-ink-light shrink-0">{formatTime(i.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function feedStatusLabel(i: FeedItem): string {
  switch (i.status) {
    case "turned_in": return "pendiente de aprobación";
    case "confirmed": case "completed": return "aprobada";
    case "rejected":  return "rechazada";
    case "forming": case "started": return "grupo abierto";
    default: return i.status;
  }
}
