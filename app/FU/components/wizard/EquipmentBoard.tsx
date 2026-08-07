"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { armors, shields, weapons } from "../../data/equipment";
import type { FUArmor, FUShield, FUWeapon } from "../../data/types";
import { equipCapabilities, findEquipmentItem } from "../../lib/derivedStats";
import { selectedClasses, useWizard } from "../../lib/wizardState";
import { EquipmentCard, type EquipmentCardData } from "../shared/EquipmentCard";

function weaponCardData(w: FUWeapon): EquipmentCardData {
  return {
    id: w.id,
    name: w.name,
    cost: w.cost,
    martial: w.martial,
    statLine: `${w.accuracy} → ${w.damage}`,
    notes: `${w.handedness === "two-handed" ? "Two-handed" : "One-handed"} · ${w.range === "melee" ? "Melee" : "Ranged"} · ${w.category}. ${w.notes}`,
  };
}
function armorCardData(a: FUArmor): EquipmentCardData {
  const def = "fixed" in a.defense ? `${a.defense.fixed}` : `DEX${a.defense.dexPlus ? ` +${a.defense.dexPlus}` : ""}`;
  const mdef =
    "fixed" in a.magicDefense ? `${a.magicDefense.fixed}` : `INS${a.magicDefense.insPlus ? ` +${a.magicDefense.insPlus}` : ""}`;
  return {
    id: a.id,
    name: a.name,
    cost: a.cost,
    martial: a.martial,
    statLine: `Def ${def} · M.Def ${mdef} · Init ${a.initiative}`,
    notes: a.notes,
  };
}
function shieldCardData(s: FUShield): EquipmentCardData {
  return {
    id: s.id,
    name: s.name,
    cost: s.cost,
    martial: s.martial,
    statLine: `Def +${s.defenseBonus} · M.Def +${s.magicDefenseBonus}`,
    notes: s.notes,
  };
}

type ShopTab = "weapons" | "armor" | "shields";

function SlotZone({
  id,
  label,
  itemId,
  onRemove,
}: {
  id: string;
  label: string;
  itemId?: string;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const item = itemId ? findEquipmentItem(itemId) : undefined;
  const data =
    item &&
    ("accuracy" in item
      ? weaponCardData(item)
      : "defenseBonus" in item
        ? shieldCardData(item)
        : armorCardData(item));

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fu-panel min-h-[92px] p-2 transition-colors",
        isOver && "border-[var(--fu-gold)] bg-[var(--fu-gold)]/5",
      )}
    >
      <div className="fu-label mb-1 text-[9px] text-[var(--fu-text-muted)]">{label}</div>
      {data ? (
        <EquipmentCard item={data} onRemove={onRemove} compact />
      ) : (
        <p className="fu-label rounded border border-dashed border-[var(--fu-border)] p-3 text-center text-[9px] text-[var(--fu-text-muted)]">
          Drop here
        </p>
      )}
    </div>
  );
}

export function EquipmentBoard() {
  const { draft, dispatch } = useWizard();
  const [tab, setTab] = useState<ShopTab>("weapons");
  const capabilities = useMemo(() => equipCapabilities(selectedClasses(draft)), [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const purchasable = {
    weapons: weapons.filter((w) => !w.martial || (w.range === "melee" ? capabilities.melee : capabilities.ranged)),
    armor: armors.filter((a) => !a.martial || capabilities.armor),
    shields: shields.filter((s) => !s.martial || capabilities.shield),
  };

  /** Tap-to-equip fallback for pointer setups where drag is inconvenient. */
  function equip(itemId: string) {
    const item = findEquipmentItem(itemId);
    if (!item) return;
    if ("accuracy" in item) {
      if (item.handedness === "two-handed") {
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 0 });
        dispatch({ type: "UNEQUIP_WEAPON", slot: 1 });
      } else {
        const slot = draft.equipment.weapons.length < 2 ? draft.equipment.weapons.length : 0;
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: slot as 0 | 1 });
      }
    } else if ("defenseBonus" in item) {
      dispatch({ type: "EQUIP_SHIELD", shieldId: itemId });
    } else {
      dispatch({ type: "EQUIP_ARMOR", armorId: itemId });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    const itemId = String(event.active.id);
    if (overId === "slot-weapon-0") {
      const weapon = weapons.find((w) => w.id === itemId);
      dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 0 });
      if (weapon?.handedness === "two-handed") dispatch({ type: "UNEQUIP_WEAPON", slot: 1 });
    } else if (overId === "slot-weapon-1") {
      const weapon = weapons.find((w) => w.id === itemId);
      if (weapon?.handedness === "two-handed") return; // two-handed weapons only go in the main slot
      dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 1 });
    } else if (overId === "slot-shield") {
      dispatch({ type: "EQUIP_SHIELD", shieldId: itemId });
    } else if (overId === "slot-armor") {
      dispatch({ type: "EQUIP_ARMOR", armorId: itemId });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="fu-label mb-2 flex gap-1 text-[10px]">
            {(["weapons", "armor", "shields"] as ShopTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-t-md border-b-2 px-3 py-1.5 capitalize transition-colors",
                  tab === t
                    ? "border-[var(--fu-gold)] text-[var(--fu-gold-bright)]"
                    : "border-transparent text-[var(--fu-text-muted)] hover:text-[var(--fu-text)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="fu-scrollbar grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {tab === "weapons" &&
              purchasable.weapons.map((w) => (
                <button key={w.id} type="button" onClick={() => equip(w.id)} className="text-left">
                  <EquipmentCard item={weaponCardData(w)} dragId={w.id} />
                </button>
              ))}
            {tab === "armor" &&
              purchasable.armor.map((a) => (
                <button key={a.id} type="button" onClick={() => equip(a.id)} className="text-left">
                  <EquipmentCard item={armorCardData(a)} dragId={a.id} />
                </button>
              ))}
            {tab === "shields" &&
              purchasable.shields.map((s) => (
                <button key={s.id} type="button" onClick={() => equip(s.id)} className="text-left">
                  <EquipmentCard item={shieldCardData(s)} dragId={s.id} />
                </button>
              ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--fu-text-muted)]">
            Drag a card into a slot, or tap it to equip it in the next open slot. Martial (E) items require a
            Class that grants them — only unlocked ones are shown.
          </p>
        </div>

        <div className="space-y-2">
          <SlotZone
            id="slot-weapon-0"
            label="Main Hand"
            itemId={draft.equipment.weapons[0]}
            onRemove={() => dispatch({ type: "UNEQUIP_WEAPON", slot: 0 })}
          />
          <SlotZone
            id="slot-weapon-1"
            label="Off Hand"
            itemId={draft.equipment.weapons[1]}
            onRemove={() => dispatch({ type: "UNEQUIP_WEAPON", slot: 1 })}
          />
          <SlotZone
            id="slot-shield"
            label="Shield"
            itemId={draft.equipment.shield}
            onRemove={() => dispatch({ type: "EQUIP_SHIELD", shieldId: undefined })}
          />
          <SlotZone
            id="slot-armor"
            label="Armor"
            itemId={draft.equipment.armor}
            onRemove={() => dispatch({ type: "EQUIP_ARMOR", armorId: undefined })}
          />
        </div>
      </div>
    </DndContext>
  );
}
