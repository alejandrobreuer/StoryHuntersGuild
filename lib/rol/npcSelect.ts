// shg_rol_npc has two FKs into shg_rol_location (residence vs. origin) — the
// embed must be disambiguated by constraint name, or PostgREST can't tell
// which column each embed should follow. Shared by every place that reads a
// full NPC row (admin CRUD, the public roster, the guild page's staff list).
export const ROL_NPC_SELECT =
  "*, residence:shg_rol_location!shg_rol_npc_residence_location_id_fkey(id, name), " +
  "origin:shg_rol_location!shg_rol_npc_origin_location_id_fkey(id, name), " +
  "factions:shg_rol_npc_faction(is_former, faction:shg_rol_faction(id, name, sort_order))";
