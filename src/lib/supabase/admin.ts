import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role Supabase client. Bypasses RLS — SERVER ONLY. This is what runs
 * the simulation and writes authoritative game state (Tome 2 section 15-16:
 * "simulations effectuees cote serveur, jamais cote client").
 *
 * Never import this from a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin env manquant (URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
