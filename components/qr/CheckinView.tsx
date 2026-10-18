"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { QrScreen } from "@/components/qr/QrScreen";
import { formatDateTime } from "@/lib/formatting";
import type { CheckinOutcome } from "@/lib/qr/checkin";

// /checkin/[token] — same pattern as MissionClaimView: the server evaluated
// the code, this sends the POST that records attendance.

export function CheckinView({ token, initial }: { token: string; initial: CheckinOutcome }) {
  const [outcome, setOutcome] = React.useState<CheckinOutcome>(initial);
  const [failed, setFailed] = React.useState(false);
  const sent = React.useRef(false);

  const checkIn = React.useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch(`/api/qr/checkin/${encodeURIComponent(token)}`, { method: "POST" });
      if (res.status === 401) {
        window.location.href = `/sign-in?next=${encodeURIComponent(`/checkin/${token}`)}`;
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data) { setFailed(true); return; }
      setOutcome(json.data as CheckinOutcome);
    } catch {
      setFailed(true);
    }
  }, [token]);

  React.useEffect(() => {
    if (initial.kind !== "ready" || sent.current) return;
    sent.current = true;
    checkIn();
  }, [initial.kind, checkIn]);

  if (failed) {
    return (
      <QrScreen tone="error" title="No pudimos registrar tu llegada">
        <p>Revisá tu conexión e intentá de nuevo.</p>
        <div className="mt-6"><Button onClick={checkIn} className="w-full">Reintentar</Button></div>
      </QrScreen>
    );
  }

  switch (outcome.kind) {
    case "ready":
      return <QrScreen tone="loading" eyebrow={outcome.eventTitle} title="Registrando tu llegada…" />;
    case "checked_in":
      return (
        <QrScreen
          tone="success"
          eyebrow={outcome.alreadyCheckedIn ? "Ya estabas registrado" : "Check-in listo"}
          title={`¡Bienvenido a ${outcome.eventTitle}!`}
          actions={
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/events/${outcome.eventId}`}>Ver el evento</Link>
            </Button>
          }
        >
          <p>
            Mantené este navegador con la sesión iniciada: esta noche vas a escanear las tarjetas de misión con él.
          </p>
        </QrScreen>
      );
    case "not_open":
      return (
        <QrScreen tone="waiting" title="El check-in todavía no abrió">
          <p>El check-in de <strong>{outcome.eventTitle}</strong> abre el {formatDateTime(outcome.opensAt)}.</p>
        </QrScreen>
      );
    case "closed":
      return (
        <QrScreen tone="warning" title="Check-in cerrado">
          <p>El check-in de <strong>{outcome.eventTitle}</strong> ya cerró.</p>
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
        <QrScreen tone="error" title="Este código de check-in no es válido">
          <p>Revisá que estés escaneando el código de la entrada del evento.</p>
        </QrScreen>
      );
  }
}
