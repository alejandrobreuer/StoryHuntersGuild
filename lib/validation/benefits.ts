import { z } from "zod";

const KINDS = ["custom", "event_discount", "monthly_invites", "monthly_2x1", "free_tickets", "bonus_rewards"] as const;

// Each kind only keeps the fields it uses (the rest are nulled), mirroring
// the shg_benefits_kind_fields check (063_shg_benefit_reward_target.sql).
export const benefitSchema = z.object({
  name:        z.string().trim().min(1, "Falta el nombre.").max(100),
  description: z.string().trim().max(500).nullable().optional().transform((d) => d || null),
  kind:        z.enum(KINDS),
  unlock_type: z.enum(["rank", "level"]),
  rank_id:     z.string().uuid().nullable().optional(),
  min_level:   z.coerce.number().int().min(1).max(999).nullable().optional(),
  percent:     z.coerce.number().int().min(1, "El porcentaje va de 1 a 100.").max(100, "El porcentaje va de 1 a 100.").nullable().optional(),
  quantity:    z.coerce.number().int().min(1, "La cantidad va de 1 a 50.").max(50, "La cantidad va de 1 a 50.").nullable().optional(),
  applies_to:  z.enum(["xp", "rp", "both"]).nullable().optional(),
  active:      z.boolean().default(true),
}).superRefine((b, ctx) => {
  if (b.unlock_type === "rank" && !b.rank_id) ctx.addIssue({ code: "custom", message: "Elegí el rango que lo desbloquea.", path: ["rank_id"] });
  if (b.unlock_type === "level" && !b.min_level) ctx.addIssue({ code: "custom", message: "Indicá el nivel que lo desbloquea.", path: ["min_level"] });
  const needsPercent = b.kind === "event_discount" || b.kind === "bonus_rewards" || b.kind === "monthly_invites";
  const needsQuantity = b.kind === "monthly_invites" || b.kind === "monthly_2x1" || b.kind === "free_tickets";
  if (needsPercent && !b.percent) ctx.addIssue({ code: "custom", message: "Indicá el porcentaje.", path: ["percent"] });
  if (b.kind === "bonus_rewards" && !b.applies_to) ctx.addIssue({ code: "custom", message: "Elegí si suma XP, RP o ambos.", path: ["applies_to"] });
  if (needsQuantity && !b.quantity) ctx.addIssue({ code: "custom", message: "Indicá la cantidad.", path: ["quantity"] });
}).transform((b) => {
  const usesPercent = b.kind === "event_discount" || b.kind === "bonus_rewards" || b.kind === "monthly_invites";
  const usesQuantity = b.kind === "monthly_invites" || b.kind === "monthly_2x1" || b.kind === "free_tickets";
  return {
    ...b,
    rank_id:   b.unlock_type === "rank" ? b.rank_id ?? null : null,
    min_level: b.unlock_type === "level" ? b.min_level ?? null : null,
    percent:   usesPercent ? b.percent ?? null : null,
    quantity:  usesQuantity ? b.quantity ?? null : null,
    applies_to: b.kind === "bonus_rewards" ? b.applies_to ?? null : null,
  };
});

export const benefitDeliverySchema = z.object({
  user_id:    z.string().uuid(),
  benefit_id: z.string().uuid(),
});
