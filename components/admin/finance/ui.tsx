import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, TYPE_LABELS } from "@/lib/finance/format";
import type { FinanceTxStatus, FinanceTxType } from "@/types/database";

// Small building blocks shared by the Finanzas pages (spec §5 palette).

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fin-crimson";

export const inputClass =
  "h-10 w-full rounded-lg border border-fin-input bg-white px-2.5 text-sm text-fin-ink " +
  "focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-fin-crimson";

export const invalidClass = "border-red-600 bg-red-50 focus:outline-red-600";

type ButtonKind = "primary" | "outline" | "ghost";

const BUTTONS: Record<ButtonKind, string> = {
  primary: "bg-fin-crimson text-white border border-fin-crimson hover:bg-[#7a231d]",
  outline: "bg-fin-surface text-fin-ink border border-fin-ink hover:bg-white",
  ghost:   "bg-transparent text-fin-ink border border-fin-input hover:bg-fin-surface",
};

export function FinButton({
  kind = "ghost", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg text-sm font-medium whitespace-nowrap",
        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        focusRing, BUTTONS[kind], className,
      )}
      {...props}
    />
  );
}

export function TypePill({ type }: { type: FinanceTxType }) {
  return (
    <span className={cn(
      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
      type === "income" ? "bg-fin-income-bg text-fin-income" : "bg-fin-expense-bg text-fin-expense-pill",
    )}>
      {TYPE_LABELS[type]}
    </span>
  );
}

const STATUS_PILL: Record<FinanceTxStatus, string> = {
  confirmed: "bg-fin-ok-bg text-fin-ok",
  pending:   "bg-fin-pending-bg text-fin-pending",
  cancelled: "bg-[#ECE8E2] text-[#6F6A63]",
};

export function StatusPill({ status }: { status: FinanceTxStatus }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_PILL[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-[10px] border border-fin-line bg-fin-surface", className)}>{children}</div>;
}
