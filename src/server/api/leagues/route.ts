import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLeagueServer } from "@/lib/supabase/repository";
import type { HistoricalDepth, SimulationMode } from "@/lib/types";

export const dynamic = "force-dynamic";
// Edge runtime so the app can deploy on Cloudflare Pages (and works on Vercel).
export const runtime = "edge";

/** GET /api/leagues — the signed-in user's leagues (read via RLS). */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, status, current_matchday, season_number, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leagues: data });
}

/** POST /api/leagues — create and fully set up a league (server-side). */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    clubName?: string;
    clubCount?: number;
    simulationMode?: SimulationMode;
    historicalDepth?: HistoricalDepth;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const clubCount = Math.min(18, Math.max(2, body.clubCount ?? 8));

  try {
    const admin = createAdminClient();
    const leagueId = await createLeagueServer(admin, {
      name: body.name ?? "Ma Ligue Retro",
      ownerId: user.id,
      clubName: body.clubName ?? "Mon Club",
      clubCount,
      simulationMode: body.simulationMode ?? "rapide",
      historicalDepth: body.historicalDepth ?? "TOUTE_HISTOIRE",
    });
    return NextResponse.json({ id: leagueId }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
