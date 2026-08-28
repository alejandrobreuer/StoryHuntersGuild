/**
 * Loads Fabula Ultima reference data (classes, skills, spells, arcana,
 * inventions, equipment, status effects, inventory items) from the
 * shg_fu_* tables — see supabase/migrations/034_shg_fu_reference_data.sql —
 * and reassembles it into the exact shapes app/FU/lib/derivedStats.ts and
 * the character sheet already work with.
 *
 * Server-only: uses the admin (service-role) Supabase client. Only call
 * this from API routes / Server Components, never from a "use client"
 * component — client code should hit /api/rol/fu-reference instead (see
 * app/FU/lib/useReferenceData.ts).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FUClass, FUClassBenefit, FUSkill, FUSpell, FUArcanum, FUInventionType, FUInventionTier,
  FUWeapon, FUArmor, FUShield,
} from "./types";
import type { FUStatusEffect, AttributeKey } from "./statusEffects";
import type { FUIpItem } from "./reference";
import type { FUReferenceData, FUHeroicSkill } from "./referenceDataType";

export async function loadReferenceData(): Promise<FUReferenceData> {
  const admin = createAdminClient();

  const [
    { data: classRows, error: classErr },
    { data: skillRows, error: skillErr },
    { data: spellRows, error: spellErr },
    { data: arcanumRows, error: arcanumErr },
    { data: inventionRows, error: inventionErr },
    { data: weaponRows, error: weaponErr },
    { data: armorShieldRows, error: armorShieldErr },
    { data: statusEffectRows, error: statusEffectErr },
    { data: inventoryItemRows, error: inventoryItemErr },
    { data: heroicSkillRows, error: heroicSkillErr },
  ] = await Promise.all([
    admin.from("shg_fu_class").select("*").order("sort_order"),
    admin.from("shg_fu_skill").select("*").order("sort_order"),
    admin.from("shg_fu_spell").select("*").order("sort_order"),
    admin.from("shg_fu_arcanum").select("*").order("sort_order"),
    admin.from("shg_fu_invention_type").select("*").order("sort_order"),
    admin.from("shg_fu_weapon").select("*").order("sort_order"),
    admin.from("shg_fu_armor_shield").select("*").order("sort_order"),
    admin.from("shg_fu_status_effect").select("*").order("sort_order"),
    admin.from("shg_fu_inventory_item").select("*").order("sort_order"),
    admin.from("shg_fu_heroic_skill").select("*").order("sort_order"),
  ]);

  const firstError = classErr ?? skillErr ?? spellErr ?? arcanumErr ?? inventionErr ?? weaponErr ?? armorShieldErr ?? statusEffectErr ?? inventoryItemErr ?? heroicSkillErr;
  if (firstError) throw new Error(`Failed to load Fabula Ultima reference data: ${firstError.message}`);

  const classes: FUClass[] = (classRows ?? []).map((row) => {
    const skills: FUSkill[] = (skillRows ?? [])
      .filter((s) => s.class_id === row.id)
      .map((s) => ({ name: s.name, maxLevel: s.max_level, text: s.description }));

    const spells = (spellRows ?? []).filter((s) => s.class_id === row.id);
    const arcana = (arcanumRows ?? []).filter((a) => a.class_id === row.id);
    const inventions = (inventionRows ?? []).filter((i) => i.class_id === row.id);

    let subsystem: FUClass["subsystem"];
    if (spells.length > 0) {
      subsystem = {
        type: "spells",
        entries: spells.map((s): FUSpell => ({
          name: s.name,
          offensive: s.offensive,
          mpCost: s.mp_cost,
          target: s.target,
          duration: s.duration,
          text: s.description,
          opportunity: s.opportunity ?? undefined,
        })),
      };
    } else if (arcana.length > 0) {
      subsystem = {
        type: "arcana",
        entries: arcana.map((a): FUArcanum => ({
          name: a.name,
          domains: a.domains,
          mergeText: a.merge_effect,
          dismissText: a.dismiss_effect,
        })),
      };
    } else if (inventions.length > 0) {
      subsystem = {
        type: "inventions",
        entries: inventions.map((i): FUInventionType => ({
          id: i.id,
          name: i.name,
          alsoKnownAs: i.also_known_as,
          description: i.description,
          tiers: i.tiers as FUInventionTier[],
        })),
      };
    }

    return {
      id: row.id as string,
      name: row.name as string,
      alsoKnownAs: row.also_known_as as string[],
      description: row.description as string,
      roleplayQuestions: row.roleplay_questions as string[],
      freeBenefits: row.free_benefits as FUClassBenefit[],
      skills,
      ...(subsystem ? { subsystem } : {}),
    };
  });

  const classesById = Object.fromEntries(classes.map((c) => [c.id, c]));

  const weapons: FUWeapon[] = (weaponRows ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    cost: w.cost,
    martial: w.martial,
    handedness: w.handedness,
    range: w.range_type,
    accuracy: w.accuracy,
    damage: w.damage,
    notes: w.notes,
  }));

  const armors: FUArmor[] = (armorShieldRows ?? [])
    .filter((r) => r.item_type === "armor")
    .map((r) => ({
      id: r.id,
      name: r.name,
      cost: r.cost,
      martial: r.martial,
      defense: r.defense as FUArmor["defense"],
      magicDefense: r.magic_defense as FUArmor["magicDefense"],
      initiative: r.initiative,
      notes: r.notes,
    }));

  const shields: FUShield[] = (armorShieldRows ?? [])
    .filter((r) => r.item_type === "shield")
    .map((r) => ({
      id: r.id,
      name: r.name,
      cost: r.cost,
      martial: r.martial,
      defenseBonus: (r.defense as { bonus: number }).bonus,
      magicDefenseBonus: (r.magic_defense as { bonus: number }).bonus,
      initiative: r.initiative,
      notes: r.notes,
    }));

  const statusEffects: FUStatusEffect[] = (statusEffectRows ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    affects: e.affects as AttributeKey[],
    description: e.description,
  }));

  const ipItems: FUIpItem[] = (inventoryItemRows ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    ipCost: i.ip_cost,
    effect: i.effect,
  }));

  const heroicSkills: FUHeroicSkill[] = (heroicSkillRows ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    requirement: h.requirement,
    description: h.description,
  }));

  return { classes, classesById, weapons, armors, shields, statusEffects, ipItems, heroicSkills };
}
