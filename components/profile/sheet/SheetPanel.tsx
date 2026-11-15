import { cn } from "@/lib/utils";

/** Parchment panel used across the profile sheet. `framed` adds the inner
 * hairline (double border) used on the character card. */
export function SheetPanel({ children, className, framed = false, ...rest }: {
  children: React.ReactNode;
  className?: string;
  framed?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...rest}
      className={cn(
        "relative min-w-0 bg-gradient-to-br from-parchment to-parchment-dark border",
        framed ? "border-brass shadow-parchment" : "border-parchment-deep",
        className
      )}
    >
      {framed && <div aria-hidden className="pointer-events-none absolute inset-1.5 border border-parchment-deep" />}
      <div className="relative h-full">{children}</div>
    </section>
  );
}

export function SheetHeading({ icon, children, action, className }: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {icon}
      <h2 className="font-display font-semibold text-lg text-ink-heading">{children}</h2>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

/** Small-caps Cinzel label. */
export function SheetLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-display text-xs uppercase tracking-[0.12em] text-brass-dark", className)}>{children}</p>;
}
