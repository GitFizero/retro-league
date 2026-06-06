import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Club,
  Fixture,
  HistoricalDepth,
  League,
  LineupEntry,
  MatchEvent,
  SimulationMode,
} from "@/lib/types";
import {
  AI_NAMES,
  PERSONALITIES,
  bestFormationFor,
  refreshAiLineup,
} from "@/lib/engine/ai";
import { autoLineup } from "@/lib/engine/composition";
import { aiDraftSquad } from "@/lib/engine/draft";
import { generateFixtures, totalMatchdays } from "@/lib/engine/fixtures";
import { Rng } from "@/lib/engine/rng";
import { simulateFixture } from "@/lib/engine/simulation";

type Db = SupabaseClient<Database>;

export interface CreateLeagueServerInput {
  name: string;
  ownerId: string;
  clubName: string;
  clubCount: number;
  simulationMode: SimulationMode;
  historicalDepth: HistoricalDepth;
}

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Creates a fully set-up league server-side: one human club + AI clubs, all
 * auto-drafted, calendar generated, ready to play. (The interactive human
 * draft — draw/pick — would be a separate set of endpoints that replace the
 * human auto-draft below.) All writes use the service-role client.
 */
export async function createLeagueServer(
  db: Db,
  input: CreateLeagueServerInput
): Promise<string> {
  const seed = Math.floor(Math.random() * 1e9);
  const depth = input.historicalDepth;

  const { data: league, error: leagueErr } = await db
    .from("leagues")
    .insert({
      name: input.name || "Ma Ligue Retro",
      invite_code: inviteCode(),
      simulation_mode: input.simulationMode,
      historical_depth: depth,
      status: "season",
      current_matchday: 1,
      season_number: 1,
      owner_id: input.ownerId,
    })
    .select("id")
    .single();
  if (leagueErr || !league) throw leagueErr ?? new Error("league insert failed");

  // Build club rows: human + AI.
  const aiCount = Math.max(1, input.clubCount - 1);
  const aiNames = new Rng(seed).shuffle(AI_NAMES).slice(0, aiCount);

  const clubRows: Database["public"]["Tables"]["clubs"]["Insert"][] = [
    {
      league_id: league.id,
      user_id: input.ownerId,
      name: input.clubName || "Mon Club",
      is_ai: false,
      formation: "4-4-2",
    },
    ...aiNames.map((name, i) => ({
      league_id: league.id,
      name,
      is_ai: true,
      personality: PERSONALITIES[i % PERSONALITIES.length],
      formation: "4-4-2",
    })),
  ];

  const { data: clubs, error: clubsErr } = await db
    .from("clubs")
    .insert(clubRows)
    .select("id, is_ai, personality");
  if (clubsErr || !clubs) throw clubsErr ?? new Error("clubs insert failed");

  // Draft a squad for every club and persist its lineup.
  const squadRows: Database["public"]["Tables"]["squad_players"]["Insert"][] = [];
  clubs.forEach((club, i) => {
    const personality = club.personality ?? "equilibree";
    const squad = aiDraftSquad(new Rng(seed + i * 7919 + 1), depth, personality);
    const formation = bestFormationFor(squad);
    const lineup = autoLineup(squad, formation);
    for (const entry of lineup) {
      squadRows.push({
        club_id: club.id,
        player_id: entry.playerId,
        starter: entry.starter,
        assigned_position: entry.assignedPosition,
        bench_order: entry.benchOrder ?? null,
      });
    }
    // Persist the chosen formation.
    void db.from("clubs").update({ formation }).eq("id", club.id);
  });
  const { error: squadErr } = await db.from("squad_players").insert(squadRows);
  if (squadErr) throw squadErr;

  // Generate the double round-robin over the real club uuids.
  const fixtureRows = generateFixtures(clubs.map((c) => c.id)).map((f) => ({
    league_id: league.id,
    matchday: f.matchday,
    home_club_id: f.homeClubId,
    away_club_id: f.awayClubId,
    status: "scheduled" as const,
  }));
  const { error: fixErr } = await db.from("fixtures").insert(fixtureRows);
  if (fixErr) throw fixErr;

  return league.id;
}

/** Assemble the full domain League from the database. */
export async function loadLeague(
  db: Db,
  leagueId: string
): Promise<League | null> {
  const { data: lg } = await db
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();
  if (!lg) return null;

  const { data: clubRows } = await db
    .from("clubs")
    .select("*")
    .eq("league_id", leagueId);
  const { data: squadRows } = await db
    .from("squad_players")
    .select("*")
    .in("club_id", (clubRows ?? []).map((c) => c.id));
  const { data: fixtureRows } = await db
    .from("fixtures")
    .select("*")
    .eq("league_id", leagueId);
  const { data: eventRows } = await db
    .from("match_events")
    .select("*")
    .in("fixture_id", (fixtureRows ?? []).map((f) => f.id));

  const clubs: Club[] = (clubRows ?? []).map((c) => {
    const own = (squadRows ?? []).filter((s) => s.club_id === c.id);
    const lineup: LineupEntry[] = own.map((s) => ({
      playerId: s.player_id,
      starter: s.starter,
      assignedPosition: s.assigned_position,
      benchOrder: s.bench_order ?? undefined,
    }));
    return {
      id: c.id,
      name: c.name,
      isAI: c.is_ai,
      personality: c.personality ?? undefined,
      squad: own.map((s) => s.player_id),
      lineup,
      formation: c.formation as Club["formation"],
      form: c.form,
    };
  });

  const fixtures: Fixture[] = (fixtureRows ?? []).map((f) => ({
    id: f.id,
    matchday: f.matchday,
    homeClubId: f.home_club_id,
    awayClubId: f.away_club_id,
    homeScore: f.home_score,
    awayScore: f.away_score,
    status: f.status,
    events: (eventRows ?? [])
      .filter((e) => e.fixture_id === f.id)
      .map(
        (e): MatchEvent => ({
          minute: e.minute,
          type: e.event_type,
          clubId: e.club_id ?? undefined,
          playerId: e.player_id ?? undefined,
          assistId: e.assist_id ?? undefined,
          description: e.description,
        })
      ),
  }));

  return {
    id: lg.id,
    name: lg.name,
    inviteCode: lg.invite_code,
    simulationMode: lg.simulation_mode,
    historicalDepth: lg.historical_depth as HistoricalDepth,
    clubPool: "all",
    withSubs: true,
    mercatoEnabled: true,
    maxTradeSize: 2,
    status: lg.status,
    currentMatchday: lg.current_matchday,
    clubs,
    fixtures,
    createdAt: Date.parse(lg.created_at),
  };
}

/**
 * Simulate the league's current matchday SERVER-SIDE and persist the results.
 * Returns the played fixtures. This is the authoritative simulation entry point
 * (Tome 2 section 15-16).
 */
export async function playNextMatchdayServer(
  db: Db,
  leagueId: string
): Promise<{ matchday: number; finished: boolean }> {
  const league = await loadLeague(db, leagueId);
  if (!league) throw new Error("league not found");
  if (league.status !== "season") {
    return { matchday: league.currentMatchday, finished: league.status === "finished" };
  }

  const md = league.currentMatchday;
  const total = totalMatchdays(league.clubs.length);
  const byId = new Map(league.clubs.map((c) => [c.id, c]));

  const todays = league.fixtures.filter(
    (f) => f.matchday === md && f.status === "scheduled"
  );

  for (const f of todays) {
    const home = byId.get(f.homeClubId);
    const away = byId.get(f.awayClubId);
    if (!home || !away) continue;
    const r = simulateFixture(home, away, { matchday: md, totalMatchdays: total });

    await db
      .from("fixtures")
      .update({ home_score: r.homeScore, away_score: r.awayScore, status: "played" })
      .eq("id", f.id);

    if (r.events.length > 0) {
      await db.from("match_events").insert(
        r.events.map((e) => ({
          fixture_id: f.id,
          minute: e.minute,
          event_type: e.type,
          club_id: e.clubId ?? null,
          player_id: e.playerId ?? null,
          assist_id: e.assistId ?? null,
          description: e.description,
        }))
      );
    }

    await db.from("clubs").update({ form: r.homeFormAfter }).eq("id", home.id);
    await db.from("clubs").update({ form: r.awayFormAfter }).eq("id", away.id);
  }

  const nextMd = md + 1;
  const finished = nextMd > total;
  await db
    .from("leagues")
    .update({
      current_matchday: nextMd,
      status: finished ? "finished" : "season",
    })
    .eq("id", leagueId);

  return { matchday: md, finished };
}

/** Keep AI lineups coherent after a roster change (mercato). */
export function refreshedAiClub(club: Club): Club {
  return club.isAI ? refreshAiLineup(club) : club;
}
