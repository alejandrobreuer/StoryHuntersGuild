import * as React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type QrScreenTone = "success" | "waiting" | "warning" | "error" | "loading";

const TONES: Record<QrScreenTone, { Icon: typeof CheckCircle2; className: string }> = {
  success: { Icon: CheckCircle2,  className: "text-moss" },
  waiting: { Icon: Clock,         className: "text-brass" },
  warning: { Icon: AlertTriangle, className: "text-brass" },
  error:   { Icon: XCircle,       className: "text-crimson" },
  loading: { Icon: Loader2,       className: "text-brass animate-spin" },
};

/** One full, mobile-first result card for every outcome of a QR scan —
 * a player should never land on a raw error. */
export function QrScreen({
  tone, eyebrow, title, children, actions,
}: {
  tone: QrScreenTone;
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { Icon, className } = TONES[tone];
  return (
    <div className="w-full max-w-sm surface-parchment p-7 text-center">
      <Icon size={44} className={cn("mx-auto mb-4", className)} aria-hidden />
      {eyebrow && (
        <p className="font-label text-2xs uppercase tracking-widest text-leather-light mb-1">{eyebrow}</p>
      )}
      <h1 className="font-display text-xl text-ink mb-3">{title}</h1>
      {children && <div className="font-body text-sm text-ink-light leading-relaxed">{children}</div>}
      {actions && <div className="mt-6 flex flex-col gap-2">{actions}</div>}
    </div>
  );
}
