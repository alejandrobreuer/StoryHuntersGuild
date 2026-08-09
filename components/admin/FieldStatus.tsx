import { cn } from "@/lib/utils";

/**
 * Field-label completeness indicator used on the admin Events/Games cards:
 * `ok=false` → red (missing), `ok=true` → green (present), `ok=null` →
 * neutral default color (used where only "missing" needs flagging, not
 * "present").
 */
export function FieldStatus({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "font-label text-2xs font-semibold uppercase tracking-widest",
        ok === false ? "text-crimson" : ok === true ? "text-moss-dark" : "text-leather-light"
      )}
    >
      {children}
    </span>
  );
}
