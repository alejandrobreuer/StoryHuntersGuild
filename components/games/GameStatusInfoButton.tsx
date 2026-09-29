"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { GAME_STATUS_INFO } from "@/lib/gamification/gameStatusInfo";

// The "(!)" flag next to a game's special-status badge — self-contained
// (owns its own open state + modal) so it can be dropped next to either
// badge. Always explains BOTH special statuses in one popup, since a
// player seeing either badge benefits from knowing what both mean.
export function GameStatusInfoButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={GAME_STATUS_INFO.title}
        title={GAME_STATUS_INFO.title}
        className={cn("inline-flex items-center justify-center align-middle hover:text-brass-bright transition-colors", className)}
      >
        <AlertCircle size={13} strokeWidth={2.5} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={GAME_STATUS_INFO.title} className="max-w-md">
        <div className="flex flex-col gap-4">
          {GAME_STATUS_INFO.items.map((item) => (
            <div key={item.label}>
              <p className="font-label text-xs font-bold uppercase tracking-wide text-ink mb-1">{item.label}</p>
              <p className="font-body text-sm text-ink-light leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
