import { createClient } from "@supabase/supabase-js";

// Scoped to shg_-prefixed tables only, via a dedicated Postgres role (see
// supabase/migrations/002_shg_scoped_role.sql) — NOT cardstash.ar's
// service-role key, which would bypass RLS project-wide. A leak of
// SHG_SERVICE_ROLE_JWT can only ever touch shg_ data.
//
// SHG does not use Supabase Auth. There is no .auth.* usage anywhere in this
// file or its callers — see lib/auth/* for SHG's own session handling.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SHG_SERVICE_ROLE_JWT!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
