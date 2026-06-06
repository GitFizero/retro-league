"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Identite anonyme du multijoueur : pas de compte, juste un pseudo + un code de
 * ligue. Supabase "anonymous sign-in" donne un vrai auth.uid() (donc les RLS
 * fonctionnent) sans email ni mot de passe. Le pseudo est stocke en
 * localStorage et pousse cote serveur via le RPC set_username.
 */
const PSEUDO_KEY = "retro-pseudo";

export function getPseudo(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(PSEUDO_KEY) ?? "";
}

export function setPseudoLocal(pseudo: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PSEUDO_KEY, pseudo.trim().slice(0, 24));
  }
}

/** True when the multiplayer backend is configured (env present). */
export function multiplayerEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Ensure an anonymous session exists and the pseudo is set. Returns the user id.
 */
export async function ensureAnonSession(pseudo: string): Promise<string> {
  const supabase = createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: pseudo ? { data: { username: pseudo.trim().slice(0, 24) } } : undefined,
    });
    if (error) throw error;
    user = data.user;
  }

  if (pseudo) {
    setPseudoLocal(pseudo);
    // RPC defini dans 0002_multiplayer.sql (typage souple : la base hand-typed
    // ne declare pas encore les Functions).
    await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<unknown>)("set_username", { p_name: pseudo.trim().slice(0, 24) });
  }

  if (!user) throw new Error("anon session failed");
  return user.id;
}
