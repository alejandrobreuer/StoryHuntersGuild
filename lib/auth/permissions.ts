import type { PermissionKey, ShgSecurityRole } from "@/types/database";

// Single source of truth for the admin-panel sections a role can be
// granted/denied — sidebar order, labels, and the shg_security_roles
// column each maps to. Add a new admin feature here (+ its perm_* column
// in a migration) and the roles UI, sidebar filtering, and route guards
// all pick it up automatically.
export const PERMISSIONS = [
  { key: "events",        column: "perm_events",        label: "Eventos" },
  { key: "venues",        column: "perm_venues",        label: "Lugares" },
  { key: "games",         column: "perm_games",         label: "Juegos" },
  { key: "tags",          column: "perm_tags",          label: "Tags" },
  { key: "users",         column: "perm_users",         label: "Usuarios" },
  { key: "quests",        column: "perm_quests",        label: "Misiones" },
  { key: "turn_ins",      column: "perm_turn_ins",      label: "Aprobaciones de entregas" },
  { key: "ranks",         column: "perm_ranks",         label: "Rangos" },
  { key: "badges",        column: "perm_badges",        label: "Insignias" },
  { key: "feature_flags", column: "perm_feature_flags", label: "Funciones" },
  { key: "bookings",      column: "perm_bookings",      label: "Reservas" },
  { key: "reports",       column: "perm_reports",       label: "Reportes" },
  { key: "settings",      column: "perm_settings",      label: "Configuración" },
  { key: "roles",         column: "perm_roles",         label: "Roles y Administradores" },
  { key: "rol",           column: "perm_rol",           label: "Gremio (Rol)" },
  { key: "planning",       column: "perm_planning",       label: "Planificación" },
  { key: "planning_admin", column: "perm_planning_admin", label: "Planificación (admin)" },
] as const satisfies { key: PermissionKey; column: keyof ShgSecurityRole; label: string }[];

export type PermissionMap = Record<PermissionKey, boolean>;

export function permissionMapFromRole(role: Pick<ShgSecurityRole, (typeof PERMISSIONS)[number]["column"]>): PermissionMap {
  const map = {} as PermissionMap;
  for (const { key, column } of PERMISSIONS) map[key] = Boolean(role[column]);
  return map;
}

/** True for a role that can only reach Planning (has `planning`, lacks every
 * other section) — this app's equivalent of the spec's "staff" tier. Used to
 * send that admin straight to My tasks instead of the main dashboard. */
export function isPlanningOnlyRole(permissions: PermissionMap): boolean {
  if (!permissions.planning) return false;
  return PERMISSIONS.every(({ key }) => key === "planning" || !permissions[key]);
}
