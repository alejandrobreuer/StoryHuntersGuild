/**
 * The bundle of Fabula Ultima reference data (classes, equipment, status
 * effects, inventory items) that derivedStats.ts's calculators and the
 * character sheet need — populated from the DB via loadReferenceData.ts
 * (server) or useReferenceData.ts (client). Kept in its own file, separate
 * from both, so a type-only import never risks pulling server-only code
 * (the admin Supabase client) into a client bundle.
 */
import type { FUClass, FUWeapon, FUArmor, FUShield } from "./types";
import type { FUStatusEffect } from "./statusEffects";
import type { FUIpItem } from "./reference";

export interface FUReferenceData {
  classes: FUClass[];
  classesById: Record<string, FUClass>;
  weapons: FUWeapon[];
  armors: FUArmor[];
  shields: FUShield[];
  statusEffects: FUStatusEffect[];
  ipItems: FUIpItem[];
}
