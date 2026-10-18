"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  children:  React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  /** false disables closing by clicking the backdrop — only the X button
   * (and the caller's own onClose calls) can close it. Defaults to true.
   * Meant for forms where an accidental outside click would otherwise
   * silently discard everything typed so far. */
  closeOnBackdropClick?: boolean;
}

export function Modal({
  open, onClose, title, children, className, titleClassName, bodyClassName, footer, closeOnBackdropClick = true,
}: ModalProps) {
  // Portal straight to <body>. Some callers render the trigger inside a
  // transformed ancestor (e.g. a rotated quest card) — a CSS transform on
  // an ancestor creates a new containing block for `position: fixed`
  // descendants, which would otherwise trap this modal inside that
  // card's rotated, clipped box instead of covering the viewport.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/85 p-4"
      onClick={(e) => { if (closeOnBackdropClick && e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "relative w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden surface-parchment animate-fade-in shadow-parchment-lg",
        className
      )}>
        <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-3 bg-parchment border-b-2 border-border">
          <h2 className={cn("font-label font-semibold text-ink", titleClassName ?? "text-lg")}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 ml-auto text-leather-light hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className={cn("flex-1 min-h-0 overflow-y-auto p-7", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-7 py-4 bg-parchment-dark border-t-2 border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
