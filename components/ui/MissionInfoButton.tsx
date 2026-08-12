"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { MISSION_TYPE_INFO } from "@/lib/gamification/missionTypeInfo";
import type { QuestType } from "@/types/database";

interface MissionInfoButtonProps {
  type: QuestType;
  className?: string;
}

// The "(!)" badge every mission display gets in its top-right corner —
// self-contained (owns its own open state + modal) so it can be dropped
// into any card/banner without the parent needing to wire anything up.
// Always call stopPropagation from the parent isn't required — this button
// stops it internally — but parents with their own onClick (e.g. a
// clickable banner) should still be aware a click here won't bubble.
export function MissionInfoButton({ type, className }: MissionInfoButtonProps) {
  const [open, setOpen] = React.useState(false);
  const info = MISSION_TYPE_INFO[type];

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={info.title}
        title={info.title}
        className={cn(
          "absolute top-2 right-2 z-20 flex items-center justify-center size-6 rounded-full",
          "bg-parchment/90 border border-brass text-brass shadow-parchment",
          "hover:bg-brass hover:text-parchment transition-colors",
          className
        )}
      >
        <AlertCircle size={15} strokeWidth={2.25} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={info.title} className="max-w-md">
        <p className="font-body text-sm text-ink-light leading-relaxed">{info.description}</p>
      </Modal>
    </>
  );
}
