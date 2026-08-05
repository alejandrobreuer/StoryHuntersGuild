import { createClient } from "@supabase/supabase-js";

// Scoped to shg_-prefixed tables only, via a dedicated Postgres role (see
// supabase/migrations/002_shg_scoped_role.sql) — NOT cardstash.ar's
// service-role key, which would bypass RLS project-wide. A leak of
// SHG_SERVICE_ROLE_JWT can only ever touch shg_ data.
//
// SHG does not use Supabase Auth. There is no .auth.* usage anywhere in this
// file or its callers — see lib/auth/* for SHG's own session handling.
// Supabase's gateway (Kong) validates the `apikey` header against known
// project key types independently of PostgREST's role-switching — it will
// reject an unrecognized custom-role JWT there even if correctly signed.
// So `apikey` stays the real (public) anon key to pass the gateway, while
// `Authorization` is overridden with the shg_service JWT, which is what
// PostgREST actually reads to pick the Postgres role.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${process.env.SHG_SERVICE_ROLE_JWT}` } },
    }
  );
}
