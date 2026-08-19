"use client";

import * as React from "react";
import { X, ZoomIn } from "lucide-react";

export function GuildImageLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in"
        aria-label={`Ver ${alt} en tamaño completo`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio */}
        <img src={src} alt={alt} className="w-full h-auto surface-parchment transition-opacity group-hover:opacity-90" />
        <span className="absolute bottom-2 right-2 flex items-center justify-center size-8 rounded-full bg-ink/70 text-parchment opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={16} />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 text-parchment hover:text-brass-bright transition-colors"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- must render at its natural aspect ratio */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain shadow-parchment-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
