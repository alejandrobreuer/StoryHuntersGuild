"use client";

import * as React from "react";
import { Gift, Lock, Copy, Check, Ticket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProfileBenefit {
  id:          string;
  name:        string;
  /** What it does, in a line (describeBenefit). */
  summary:     string;
  description: string | null;
  unlocked:    boolean;
  /** "Rango Plata" / "Nivel 5". */
  unlockLabel: string;
  /** Extra state: "Te quedan 2 este mes", "Pendiente de retirar"… */
  status:      string | null;
}

export interface ProfileInviteCode {
  code:      string;
  discount:  number;
  expiresAt: string;
  used:      boolean;
}

export function BenefitsSection({ benefits, invites }: { benefits: ProfileBenefit[]; invites: ProfileInviteCode[] }) {
  const unlocked = benefits.filter((b) => b.unlocked);
  const locked = benefits.filter((b) => !b.unlocked);
  const available = invites.filter((i) => !i.used);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      toast.error("No se pudo copiar. Seleccioná el código y copialo a mano.");
    }
  }

  return (
    <section>
      <h2 className="font-display text-xl text-ink mb-3">Tus beneficios</h2>

      {unlocked.length === 0 ? (
        <p className="font-body italic text-sm text-ink-light mb-3">
          Todavía no desbloqueaste beneficios. Subí de rango o de nivel para conseguirlos.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {unlocked.map((b) => (
            <li key={b.id} className="surface-parchment px-4 py-3 flex gap-3">
              <Gift size={18} className="text-crimson shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-label text-sm font-bold text-ink">{b.name}</p>
                {b.summary !== b.name && <p className="font-body text-sm text-ink-light">{b.summary}</p>}
                {b.description && <p className="font-body text-xs italic text-ink-light">{b.description}</p>}
                {b.status && (
                  <p className="font-label text-2xs uppercase tracking-wide text-moss-dark mt-1">{b.status}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <div className="surface-parchment px-4 py-3 mb-3">
          <p className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-1 flex items-center gap-1.5">
            <Ticket size={13} /> Tus invitaciones
          </p>
          <p className="font-body text-xs text-ink-light mb-2">
            Compartilas con alguien que nunca vino: lo carga como cupón al reservar.
            {available.length === 0 && " Ya usaste todas las de este mes."}
          </p>
          <ul className="flex flex-col gap-1.5">
            {invites.map((i) => (
              <li key={i.code} className={cn("flex items-center justify-between gap-3 flex-wrap", i.used && "opacity-60")}>
                <span className="font-label text-sm font-semibold text-ink select-all">
                  {i.code} <span className="font-body font-normal text-xs text-ink-light">
                    · {i.discount === 100 ? "entrada gratis" : `${i.discount}% off`} ·{" "}
                    {i.used ? "usada" : `vence el ${new Date(i.expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" })}`}
                  </span>
                </span>
                {!i.used && (
                  <button
                    type="button" onClick={() => copy(i.code)}
                    className="flex items-center gap-1 font-label text-2xs uppercase tracking-wide text-brass hover:text-brass-bright transition-colors"
                  >
                    {copied === i.code ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {locked.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-label text-xs uppercase tracking-widest text-leather-light hover:text-brass">
            Próximos beneficios ({locked.length})
          </summary>
          <ul className="flex flex-col gap-1.5 mt-2">
            {locked.map((b) => (
              <li key={b.id} className="flex items-start gap-2 font-body text-sm text-ink-light">
                <Lock size={13} className="shrink-0 mt-1" />
                <span><strong className="text-ink">{b.unlockLabel}:</strong> {b.summary !== b.name ? `${b.name} — ${b.summary}` : b.name}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
