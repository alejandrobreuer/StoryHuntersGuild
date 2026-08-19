import Image from "next/image";
import { cn } from "@/lib/utils";

// Same parchment art + rotation pattern as components/events/QuestBoard.tsx's
// QuestPaperCard — reused here without the store-specific MissionInfoButton
// (individual/group mission explainer), since Rol quests don't have that
// concept.
const QUEST_PAPER_IMAGES = [
  "/images/quest-paper-classic-red-seal.png",
  "/images/quest-paper-formal-burgundy-seal.png",
  "/images/quest-paper-guild-blue-seal.png",
  "/images/quest-paper-rugged-green-seal.png",
];
const PAPER_ANGLES = [-1.5, 1, -0.75, 1.25, -1, 0.5];

export function RolQuestPaperCard({
  index, className, children,
}: {
  index: number; className?: string; children: React.ReactNode;
}) {
  const paperSrc = QUEST_PAPER_IMAGES[index % QUEST_PAPER_IMAGES.length];
  const angle = PAPER_ANGLES[index % PAPER_ANGLES.length];
  return (
    <div style={{ transform: `rotate(${angle}deg)` }} className="mx-auto w-full max-w-[260px]">
      {/* Locked to the parchment art's own 955:1232 ratio so the paper never
       * letterboxes or stretches regardless of the grid column's width. */}
      <div className={cn("relative w-full max-w-[260px] mx-auto", className)} style={{ aspectRatio: "955 / 1232" }}>
        <Image src={paperSrc} alt="" fill sizes="260px" className="object-contain pointer-events-none select-none" />
        {/* Padding matches the art's measured margins so text stays clear
         * of the torn edges and corner ornaments. */}
        <div className="absolute inset-0 flex flex-col gap-1.5 pt-[15.71%] pr-[15.29%] pb-[12.36%] pl-[15.29%] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
