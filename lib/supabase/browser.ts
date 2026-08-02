import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

// Anon key + RLS — safe to share with cardstash.ar's project, since the anon
// key was never a privilege-bypass mechanism (constrained by RLS policies,
// see 001_shg_init.sql). Only used for the narrow public-read paths (games,
// published events) where a direct client-side query is convenient; most
// data access still goes through SHG's own API routes.
export function createBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
