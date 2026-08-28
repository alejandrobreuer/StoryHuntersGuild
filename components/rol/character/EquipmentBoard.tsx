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
import { equipCapabilities, findEquipmentItem } from "@/app/FU/lib/derivedStats";
import { weaponCardData, armorCardData, shieldCardData } from "@/app/FU/lib/equipmentDisplay";
import { selectedClasses, useWizard } from "@/app/FU/lib/wizardState";
import { useReferenceDataContext } from "@/app/FU/lib/ReferenceDataContext";
import { EquipmentCard } from "./EquipmentCard";

type ShopTab = "weapons" | "armor" | "shields";
const TAB_LABELS: Record<ShopTab, string> = { weapons: "Armas", armor: "Armaduras", shields: "Escudos" };

function SlotZone({ id, label, itemId, onRemove }: { id: string; label: string; itemId?: string; onRemove: () => void }) {
  const ref = useReferenceDataContext();
  const { setNodeRef, isOver } = useDroppable({ id });
  const item = itemId ? findEquipmentItem(itemId, ref) : undefined;
  const data = item && ("accuracy" in item ? weaponCardData(item) : "defenseBonus" in item ? shieldCardData(item) : armorCardData(item));

  return (
    <div ref={setNodeRef} className={cn("surface-parchment min-h-[108px] p-3 transition-colors", isOver && "border-brass bg-brass/5")}>
      <div className="font-label mb-1.5 text-xs uppercase tracking-wide text-ink-light">{label}</div>
      {data ? (
        <EquipmentCard item={data} onRemove={onRemove} compact />
      ) : (
        <p className="font-label border border-dashed border-border p-4 text-center text-xs uppercase tracking-wide text-ink-light">Soltá acá</p>
      )}
    </div>
  );
}

export function EquipmentBoard() {
  const { draft, dispatch } = useWizard();
  const ref = useReferenceDataContext();
  const [tab, setTab] = useState<ShopTab>("weapons");
  const capabilities = useMemo(() => equipCapabilities(selectedClasses(draft)), [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const purchasable = {
    weapons: ref.weapons.filter((w) => !w.martial || (w.range === "melee" ? capabilities.melee : capabilities.ranged)),
    armor: ref.armors.filter((a) => !a.martial || capabilities.armor),
    shields: ref.shields.filter((s) => !s.martial || capabilities.shield),
  };

  // The item's own type always decides which slot it goes to — a drop
  // target only matters for picking between the two weapon slots. This is
  // what previously let a weapon end up equipped as armor: handleDragEnd
  // used to trust whichever slot the card was dropped on instead of
  // checking what was actually being equipped, and neither path enforced
  // the same off-hand/two-handed contention rules the real character sheet
  // does (see equipFromBackpack in components/rol/character/CharacterSheet.tsx).
  function equipItem(itemId: string) {
    const item = findEquipmentItem(itemId, ref);
    if (!item) return;
    const equippedTwoHanded = ref.weapons.find((w) => w.id === draft.equipment.weapons[0])?.handedness === "two-handed";

    if ("accuracy" in item) {
      if (item.handedness === "two-handed") {
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 0 });
        dispatch({ type: "UNEQUIP_WEAPON", slot: 1 });
        if (draft.equipment.shield) dispatch({ type: "EQUIP_SHIELD", shieldId: undefined });
      } else if (equippedTwoHanded) {
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 0 });
        dispatch({ type: "UNEQUIP_WEAPON", slot: 1 });
      } else if (draft.equipment.weapons.length >= 2) {
        return;
      } else if (draft.equipment.weapons.length === 1) {
        if (draft.equipment.shield) dispatch({ type: "EQUIP_SHIELD", shieldId: undefined });
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 1 });
      } else {
        dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 0 });
      }
    } else if ("defenseBonus" in item) {
      if (equippedTwoHanded) return;
      if (draft.equipment.weapons.length >= 2) dispatch({ type: "UNEQUIP_WEAPON", slot: 1 });
      dispatch({ type: "EQUIP_SHIELD", shieldId: itemId });
    } else {
      dispatch({ type: "EQUIP_ARMOR", armorId: itemId });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    equipItem(String(event.active.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="font-label mb-3 flex gap-2 text-xs uppercase tracking-wide">
            {(["weapons", "armor", "shields"] as ShopTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn("border-b-2 px-4 py-2 transition-colors", tab === t ? "border-brass text-ink font-semibold" : "border-transparent text-ink-light hover:text-ink")}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {tab === "weapons" && purchasable.weapons.map((w) => (
              <button key={w.id} type="button" onClick={() => equipItem(w.id)} className="text-left">
                <EquipmentCard item={weaponCardData(w)} dragId={w.id} />
              </button>
            ))}
            {tab === "armor" && purchasable.armor.map((a) => (
              <button key={a.id} type="button" onClick={() => equipItem(a.id)} className="text-left">
                <EquipmentCard item={armorCardData(a)} dragId={a.id} />
              </button>
            ))}
            {tab === "shields" && purchasable.shields.map((s) => (
              <button key={s.id} type="button" onClick={() => equipItem(s.id)} className="text-left">
                <EquipmentCard item={shieldCardData(s)} dragId={s.id} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-light font-body">
            Arrastrá una carta a una ranura, o tocala para equiparla en la próxima ranura libre. Los ítems marciales
            requieren una Clase que los otorgue.
          </p>
        </div>

        <div className="space-y-3">
          <SlotZone id="slot-weapon-0" label="Mano principal" itemId={draft.equipment.weapons[0]} onRemove={() => dispatch({ type: "UNEQUIP_WEAPON", slot: 0 })} />
          <SlotZone id="slot-weapon-1" label="Mano secundaria" itemId={draft.equipment.weapons[1]} onRemove={() => dispatch({ type: "UNEQUIP_WEAPON", slot: 1 })} />
          <SlotZone id="slot-shield" label="Escudo" itemId={draft.equipment.shield} onRemove={() => dispatch({ type: "EQUIP_SHIELD", shieldId: undefined })} />
          <SlotZone id="slot-armor" label="Armadura" itemId={draft.equipment.armor} onRemove={() => dispatch({ type: "EQUIP_ARMOR", armorId: undefined })} />
        </div>
      </div>
    </DndContext>
  );
}
