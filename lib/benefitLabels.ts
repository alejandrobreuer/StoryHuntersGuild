import type { ShgBenefit } from "@/types/database";

// Client-safe benefit wording (lib/benefits.ts is server-only).

export const BENEFIT_KIND_LABEL: Record<ShgBenefit["kind"], string> = {
  custom:          "Personalizado",
  event_discount:  "Descuento permanente",
  monthly_invites: "Invitaciones mensuales",
  monthly_2x1:     "2x1 mensual",
  free_tickets:    "Entradas gratis",
  bonus_rewards:   "XP/RP extra",
};

/** One-line explanation of a benefit, for the profile and admin list. */
export function describeBenefit(b: Pick<ShgBenefit, "kind" | "percent" | "quantity" | "name">): string {
  switch (b.kind) {
    case "custom":          return b.name;
    case "event_discount":  return `${b.percent}% de descuento en tu entrada a cada evento`;
    case "monthly_invites": return `${b.quantity} ${b.quantity === 1 ? "invitación" : "invitaciones"} por mes para alguien que nunca vino (${b.percent === 100 ? "entrada gratis" : `${b.percent}% off`})`;
    case "monthly_2x1":     return `${b.quantity} ${b.quantity === 1 ? "reserva" : "reservas"} 2x1 por mes`;
    case "free_tickets":    return `${b.quantity} ${b.quantity === 1 ? "entrada gratis" : "entradas gratis"}`;
    case "bonus_rewards":   return `${b.percent}% más de XP y RP en eventos y misiones`;
  }
}
