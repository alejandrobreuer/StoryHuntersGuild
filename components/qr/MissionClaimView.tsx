"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { QrScreen } from "@/components/qr/QrScreen";
import { formatDateTime } from "@/lib/formatting";
import type { MissionClaimOutcome } from "@/lib/qr/missionClaim";

// /m/[token] — the server already ran every check. If the player can claim
// ("ready"), this sends the POST that actually creates the submission, on
// its own, so the player taps nothing.

export function MissionClaimView({ token, initial }: { token: string; initial: MissionClaimOutcome }) {
  const [outcome, setOutcome] = React.useState<MissionClaimOutcome>(initial);
  const [failed, setFailed] = React.useState(false);
  const sent = React.useRef(false);

  const claim = React.useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch(`/api/qr/missions/${encodeURIComponent(token)}/claim`, { method: "POST" });
      if (res.status === 401) {
        window.location.href = `/sign-in?next=${encodeURIComponent(`/m/${token}`)}`;
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data) { setFailed(true); return; }
      setOutcome(json.data as MissionClaimOutcome);
    } catch {
      setFailed(true);
    }
  }, [token]);

  React.useEffect(() => {
    if (initial.kind !== "ready" || sent.current) return;
    sent.current = true;
    claim();
  }, [initial.kind, claim]);

  if (failed) {
    return (
      <QrScreen tone="error" title="No pudimos registrar la misión">
        <p>Revisá tu conexión e intentá de nuevo.</p>
        <div className="mt-6"><Button onClick={claim} className="w-full">Reintentar</Button></div>
      </QrScreen>
    );
  }

  return <MissionOutcomeScreen outcome={outcome} />;
}

const MY_MISSIONS = (
  <Button asChild variant="ghost" className="w-full">
    <Link href="/quests">Ver mis misiones</Link>
  </Button>
);

function MissionOutcomeScreen({ outcome }: { outcome: MissionClaimOutcome }) {
  switch (outcome.kind) {
    case "ready":
      return <QrScreen tone="loading" eyebrow={outcome.eventTitle} title={outcome.questTitle}><p>Registrando tu misión…</p></QrScreen>;
    case "submitted":
      return (
        <QrScreen tone="success" eyebrow={outcome.eventTitle} title={outcome.questTitle} actions={MY_MISSIONS}>
          <p className="font-label text-sm font-semibold text-moss mb-2">Enviada para aprobación</p>
          <p>Un Asistente del Gremio va a confirmar tu entrega y ahí recibís la recompensa.</p>
        </QrScreen>
      );
    case "joined_party":
      return (
        <QrScreen tone="success" eyebrow={outcome.eventTitle} title={outcome.questTitle} actions={MY_MISSIONS}>
          <p className="font-label text-sm font-semibold text-moss mb-2">
            Te sumaste al grupo · {outcome.memberCount} {outcome.memberCount === 1 ? "integrante" : "integrantes"}
          </p>
          <p>Que el resto de tu mesa escanee esta misma tarjeta. El anfitrión cierra el grupo y lo confirma para todos.</p>
        </QrScreen>
      );
    case "in_party":
      return (
        <QrScreen tone="waiting" eyebrow={outcome.eventTitle} title="Ya estás en el grupo" actions={MY_MISSIONS}>
          <p>
            Sos parte del grupo de <strong>{outcome.questTitle}</strong> ({outcome.memberCount}{" "}
            {outcome.memberCount === 1 ? "integrante" : "integrantes"}). El anfitrión lo va a cerrar y confirmar.
          </p>
        </QrScreen>
      );
    case "already_pending":
      return (
        <QrScreen tone="waiting" eyebrow={outcome.eventTitle} title="Ya la entregaste" actions={MY_MISSIONS}>
          <p>Tu entrega de <strong>{outcome.questTitle}</strong> está esperando la aprobación de un Asistente del Gremio.</p>
        </QrScreen>
      );
    case "already_completed":
      return (
        <QrScreen tone="success" title="Misión ya completada" actions={MY_MISSIONS}>
          <p>Ya recibiste la recompensa de <strong>{outcome.questTitle}</strong>.</p>
        </QrScreen>
      );
    case "event_mission_closed":
      return (
        <QrScreen tone="warning" eyebrow={outcome.eventTitle} title="Esta misión ya se cerró">
          <p><strong>{outcome.questTitle}</strong> ya no acepta entregas en este evento.</p>
        </QrScreen>
      );
    case "not_open":
      return (
        <QrScreen tone="waiting" title="Las misiones todavía no abrieron">
          <p>Las misiones de <strong>{outcome.eventTitle}</strong> se abren el {formatDateTime(outcome.opensAt)}.</p>
        </QrScreen>
      );
    case "closed":
      return (
        <QrScreen tone="warning" title="Misiones cerradas">
          <p>Las misiones de <strong>{outcome.eventTitle}</strong> ya cerraron.</p>
        </QrScreen>
      );
    case "inactive":
      return (
        <QrScreen tone="error" title="Este código ya no está activo">
          <p>Consultá con el anfitrión del evento.</p>
        </QrScreen>
      );
    case "login_required":
    case "invalid":
      return (
        <QrScreen tone="error" title="Este código de misión no es válido">
          <p>Revisá que estés escaneando una tarjeta de misión del gremio.</p>
        </QrScreen>
      );
  }
}
