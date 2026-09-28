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
}

export function Modal({ open, onClose, title, children, className, titleClassName }: ModalProps) {
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "relative w-full max-w-md surface-parchment p-7 animate-fade-in shadow-parchment-lg",
        className
      )}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-leather-light hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        <h2 className={cn("font-label font-semibold text-ink mb-5 pb-3 border-b-2 border-border", titleClassName ?? "text-lg")}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
