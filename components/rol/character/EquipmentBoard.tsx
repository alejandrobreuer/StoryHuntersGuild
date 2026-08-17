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
import { armors, shields, weapons } from "@/app/FU/data/equipment";
import type { FUArmor, FUShield, FUWeapon } from "@/app/FU/data/types";
import { equipCapabilities, findEquipmentItem } from "@/app/FU/lib/derivedStats";
import { selectedClasses, useWizard } from "@/app/FU/lib/wizardState";
import { EquipmentCard, type EquipmentCardData } from "./EquipmentCard";

function weaponCardData(w: FUWeapon): EquipmentCardData {
  return {
    id: w.id, name: w.name, cost: w.cost, martial: w.martial,
    statLine: `${w.accuracy} → ${w.damage}`,
    notes: `${w.handedness === "two-handed" ? "Dos manos" : "Una mano"} · ${w.range === "melee" ? "Cuerpo a cuerpo" : "A distancia"} · ${w.category}. ${w.notes}`,
  };
}
function armorCardData(a: FUArmor): EquipmentCardData {
  const def = "fixed" in a.defense ? `${a.defense.fixed}` : `DES${a.defense.dexPlus ? ` +${a.defense.dexPlus}` : ""}`;
  const mdef = "fixed" in a.magicDefense ? `${a.magicDefense.fixed}` : `PER${a.magicDefense.insPlus ? ` +${a.magicDefense.insPlus}` : ""}`;
  return { id: a.id, name: a.name, cost: a.cost, martial: a.martial, statLine: `Def ${def} · Def.M ${mdef} · Ini ${a.initiative}`, notes: a.notes };
}
function shieldCardData(s: FUShield): EquipmentCardData {
  return { id: s.id, name: s.name, cost: s.cost, martial: s.martial, statLine: `Def +${s.defenseBonus} · Def.M +${s.magicDefenseBonus}`, notes: s.notes };
}

type ShopTab = "weapons" | "armor" | "shields";
const TAB_LABELS: Record<ShopTab, string> = { weapons: "Armas", armor: "Armaduras", shields: "Escudos" };

function SlotZone({ id, label, itemId, onRemove }: { id: string; label: string; itemId?: string; onRemove: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const item = itemId ? findEquipmentItem(itemId) : undefined;
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
  const [tab, setTab] = useState<ShopTab>("weapons");
  const capabilities = useMemo(() => equipCapabilities(selectedClasses(draft)), [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const purchasable = {
    weapons: weapons.filter((w) => !w.martial || (w.range === "melee" ? capabilities.melee : capabilities.ranged)),
    armor: armors.filter((a) => !a.martial || capabilities.armor),
    shields: shields.filter((s) => !s.martial || capabilities.shield),
  };

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
      if (weapon?.handedness === "two-handed") return;
      dispatch({ type: "EQUIP_WEAPON", weaponId: itemId, slot: 1 });
    } else if (overId === "slot-shield") {
      dispatch({ type: "EQUIP_SHIELD", shieldId: itemId });
    } else if (overId === "slot-armor") {
      dispatch({ type: "EQUIP_ARMOR", armorId: itemId });
    }
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
                className={cn("border-b-2 px-4 py-2 transition-colors", tab === t ? "border-brass text-brass-bright" : "border-transparent text-ink-light hover:text-ink")}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {tab === "weapons" && purchasable.weapons.map((w) => (
              <button key={w.id} type="button" onClick={() => equip(w.id)} className="text-left">
                <EquipmentCard item={weaponCardData(w)} dragId={w.id} />
              </button>
            ))}
            {tab === "armor" && purchasable.armor.map((a) => (
              <button key={a.id} type="button" onClick={() => equip(a.id)} className="text-left">
                <EquipmentCard item={armorCardData(a)} dragId={a.id} />
              </button>
            ))}
            {tab === "shields" && purchasable.shields.map((s) => (
              <button key={s.id} type="button" onClick={() => equip(s.id)} className="text-left">
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
