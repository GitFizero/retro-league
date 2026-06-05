"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser Supabase client (anon key, subject to RLS). Use in client components
 * for reads and realtime subscriptions (Tome 2 section 14). Never for writing
 * game state — that goes through the server API.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env manquant (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)."
    );
  }
  return createBrowserClient<Database>(url, key);
}
