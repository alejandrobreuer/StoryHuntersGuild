"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

/** The round (i) button on a sheet panel, opening a pop-up with `children`. */
export function InfoDialog({ label, title, intro, wide = false, children }: {
  /** Accessible name of the button. */
  label: string;
  title: string;
  intro?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="size-9 rounded-full border-[1.5px] border-brass bg-brass/10 text-brass-dark font-display font-bold text-[15px] leading-none hover:bg-brass/20 transition-colors"
      >
        i
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        className={cn(wide ? "max-w-3xl" : "max-w-xl", "border-brass")}
        headerClassName="bg-ink-night border-b-2 border-brass py-3.5"
        titleClassName="font-display text-base tracking-wider uppercase text-brass-light"
        closeClassName="text-brass-light hover:text-parchment"
        bodyClassName="p-5 flex flex-col gap-3"
      >
        {intro && <p className="font-body italic text-[15px] text-ink-light">{intro}</p>}
        {children}
      </Modal>
    </>
  );
}
