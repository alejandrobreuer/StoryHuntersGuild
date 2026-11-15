"use client";

import * as React from "react";
import { Copy, Check, Ticket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProfileInviteCode {
  code:      string;
  discount:  number;
  expiresAt: string;
  used:      boolean;
}

/** The player's invitation codes from monthly_invites benefits, with copy. */
export function InviteCodes({ invites }: { invites: ProfileInviteCode[] }) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const available = invites.filter((i) => !i.used);

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
    <div className="border border-dashed border-brass px-3.5 py-3">
      <p className="font-display text-[11px] uppercase tracking-[0.12em] text-brass-dark flex items-center gap-1.5">
        <Ticket size={13} aria-hidden /> Tus invitaciones
      </p>
      <p className="font-body text-sm text-ink-light mt-0.5 mb-2">
        Compartilas con alguien que nunca vino: lo carga como cupón al reservar.
        {available.length === 0 && " Ya usaste todas las de este mes."}
      </p>
      <ul className="flex flex-col gap-2">
        {invites.map((i) => (
          <li key={i.code} className={cn("flex items-center justify-between gap-3 flex-wrap", i.used && "opacity-60")}>
            <span className="min-w-0">
              <span className="font-display font-bold text-sm text-ink-heading select-all">{i.code}</span>{" "}
              <span className="font-body text-sm text-ink-light">
                · {i.discount === 100 ? "entrada gratis" : `${i.discount}% off`} ·{" "}
                {i.used ? "usada" : `vence el ${new Date(i.expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" })}`}
              </span>
            </span>
            {!i.used && (
              <button
                type="button" onClick={() => copy(i.code)}
                className="flex items-center gap-1.5 min-h-[34px] px-3.5 border border-brass font-display text-[11px] uppercase tracking-[0.12em] text-brass-dark hover:bg-brass/10 transition-colors"
              >
                {copied === i.code ? <><Check size={13} aria-hidden /> Copiado</> : <><Copy size={13} aria-hidden /> Copiar</>}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
