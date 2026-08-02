import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  /** Render the button's styling onto its single child element (e.g. a
   * next/link Link) instead of a <button>, so it can navigate. */
  asChild?:  boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-2 border-brass bg-gradient-to-br from-brass/15 to-brass/5 text-brass-light hover:from-brass/35 hover:to-brass/15 hover:text-brass-bright hover:shadow-glow",
  secondary:
    "border-2 border-moss-light bg-gradient-to-br from-moss/15 to-moss/5 text-moss-light hover:from-moss/35 hover:to-moss/15 hover:text-moss-light",
  ghost:
    "border border-leather-light/40 text-leather-light hover:border-brass hover:text-brass hover:bg-brass/5",
  danger:
    "border border-crimson text-crimson hover:bg-crimson hover:text-crimson-foreground",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-2xs px-3 py-1.5 gap-1.5",
  md: "text-xs px-5 py-2.5 gap-2",
  lg: "text-sm px-7 py-3.5 gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, asChild, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center font-label font-semibold uppercase tracking-widest no-underline",
      "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
      VARIANTS[variant],
      SIZES[size],
      className
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<{ className?: string }>,
        { className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className) }
      );
    }

    return (
      <button ref={ref} disabled={disabled || loading} className={classes} {...props}>
        {loading ? "…" : children}
      </button>
    );
  }
);
Button.displayName = "Button";
