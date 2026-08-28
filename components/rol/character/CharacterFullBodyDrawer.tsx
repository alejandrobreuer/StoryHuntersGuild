"use client";

import { User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline flex sibling of the sheet's main column (not an overlay) — closed
// by default (width 0), animates open to give the full-body image room
// without ever permanently eating sheet width. Controlled by the parent so
// the toggle button (absolutely positioned over the header) and the panel
// stay in sync — see character-sheet-reference.html's .portrait-drawer.
export function CharacterFullBodyDrawer({
  imageUrl,
  open,
  onToggle,
  onUpload,
  uploading,
}: {
  imageUrl: string | null;
  open: boolean;
  onToggle: () => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Cerrar cuerpo completo" : "Ver cuerpo completo"}
        aria-expanded={open}
        className="absolute left-0 top-3 z-10 flex items-center gap-1 rounded-r-md bg-ink/80 px-1.5 py-2 text-parchment-dark hover:text-parchment transition-colors"
      >
        <ChevronRight size={12} className={cn("transition-transform", open && "rotate-180")} />
        <User size={12} />
      </button>

      <div
        className={cn(
          "shrink-0 overflow-hidden border-brass/30 bg-parchment-dark/30 transition-[width] duration-300",
          open ? "w-40 border-r" : "w-0"
        )}
      >
        <div className="w-40 p-3">
          <div className="relative">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, size unknown ahead of render
              <img src={imageUrl} alt="" className="w-full h-auto" />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center bg-parchment-dark/40 border border-dashed border-brass/40">
                <User size={28} className="text-leather-light" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-ink/0 hover:bg-ink/50 text-transparent hover:text-parchment transition-colors cursor-pointer text-2xs font-label uppercase text-center">
              {uploading ? "…" : "Cambiar"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
