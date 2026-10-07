import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

// Search over shg_users for the "new admin" picker — scoped under the same
// "roles" permission as admin creation itself (not "users", which a
// roles-only admin may not have). Excludes accounts already granted admin
// access, and requires a couple characters so this never dumps the whole
// customer list.
export async function GET(req: NextRequest) {
  const { error } = await requirePermission("roles");
  if (error) return error;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ data: [] });

  const admin = createAdminClient();

  const { data: alreadyAdmins } = await admin.from("shg_admin_users").select("user_id").not("user_id", "is", null);
  const excludeIds = new Set((alreadyAdmins ?? []).map((a) => a.user_id as string));

  // Two plain .ilike() calls merged in JS, rather than one .or(`email.ilike.%${q}%,...`)
  // — building that filter by interpolating `q` into PostgREST's filter
  // mini-language would let a comma/parenthesis in the search text inject
  // extra filter clauses. .ilike(column, value) passes the value as a
  // proper parameter instead, same as the existing /games search.
  const [byEmail, byName] = await Promise.all([
    admin.from("shg_users").select("id, email, name").ilike("email", `%${q}%`).limit(10),
    admin.from("shg_users").select("id, email, name").ilike("name", `%${q}%`).limit(10),
  ]);
  if (byEmail.error || byName.error) return NextResponse.json({ error: "Error al buscar usuarios." }, { status: 500 });

  const seen = new Map<string, { id: string; email: string; name: string | null }>();
  for (const row of [...(byEmail.data ?? []), ...(byName.data ?? [])]) {
    if (!excludeIds.has(row.id)) seen.set(row.id, row);
  }
  const data = Array.from(seen.values()).sort((a, b) => a.email.localeCompare(b.email)).slice(0, 10);

  return NextResponse.json({ data });
}
