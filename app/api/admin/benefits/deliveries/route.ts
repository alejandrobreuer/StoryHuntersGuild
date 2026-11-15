import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { benefitDeliverySchema } from "@/lib/validation/benefits";
import { getFeatureFlags } from "@/lib/features";
import { loadBenefits, isUnlocked } from "@/lib/benefits";
import { xpForLevel } from "@/lib/gamification/progression";

const NONE = 2147483647; // int max: "no one qualifies this way"

// ─── GET /api/admin/benefits/deliveries ─────────────────────────────────────
// Custom benefits (e.g. "Una remera") that players have unlocked and staff
// haven't handed out yet, by benefit then player.

export async function GET() {
  const { error } = await requirePermission("ranks");
  if (error) return error;

  const admin = createAdminClient();
  const [flags, benefits] = await Promise.all([getFeatureFlags(), loadBenefits(admin)]);
  const custom = benefits.filter((b) => b.kind === "custom");
  if (custom.length === 0) return NextResponse.json({ data: [] });

  // Everyone who could possibly qualify: at least the lowest threshold.
  const minRp = Math.min(...custom.filter((b) => b.rank).map((b) => b.rank!.rp_required), NONE);
  const minXp = Math.min(...custom.filter((b) => b.min_level).map((b) => xpForLevel(b.min_level!)), NONE);
  const [{ data: users }, { data: delivered }] = await Promise.all([
    admin.from("shg_users").select("id, name, email, xp, rp").or(`rp.gte.${minRp},xp.gte.${minXp}`).limit(2000),
    admin.from("shg_benefit_deliveries").select("user_id, benefit_id").in("benefit_id", custom.map((b) => b.id)),
  ]);
  const done = new Set((delivered ?? []).map((d) => `${d.user_id}:${d.benefit_id}`));

  const pending: { user_id: string; user_label: string; email: string; benefit_id: string; benefit_name: string }[] = [];
  for (const b of custom) {
    for (const u of users ?? []) {
      if (!isUnlocked(b, u, flags) || done.has(`${u.id}:${b.id}`)) continue;
      pending.push({ user_id: u.id, user_label: u.name || u.email, email: u.email, benefit_id: b.id, benefit_name: b.name });
    }
  }
  pending.sort((a, b) => a.benefit_name.localeCompare(b.benefit_name, "es") || a.user_label.localeCompare(b.user_label, "es"));
  return NextResponse.json({ data: pending });
}

// ─── POST /api/admin/benefits/deliveries ────────────────────────────────────
// Marks a custom benefit as handed to a player: { user_id, benefit_id }.

export async function POST(req: NextRequest) {
  const { user: adminUser, error } = await requirePermission("ranks");
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = benefitDeliverySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });

  const admin = createAdminClient();
  const { error: insertError } = await admin
    .from("shg_benefit_deliveries")
    .upsert({ ...parsed.data, delivered_by: adminUser.id }, { onConflict: "user_id,benefit_id", ignoreDuplicates: true });
  if (insertError) return NextResponse.json({ error: "No se pudo marcar como entregado." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
