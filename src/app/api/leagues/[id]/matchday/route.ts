import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { playNextMatchdayServer } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";
// Edge runtime so the app can deploy on Cloudflare Pages (and works on Vercel).
export const runtime = "edge";

/**
 * POST /api/leagues/:id/matchday — simulate the next matchday on the server.
 * The browser never simulates (Tome 2 section 15-16); it only triggers and
 * then reads the persisted result (optionally via realtime).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS check: the league must be visible to this user (i.e. they're a member).
  const { data: visible } = await supabase
    .from("leagues")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!visible) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const admin = createAdminClient();
    const result = await playNextMatchdayServer(admin, id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
