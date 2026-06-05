import {
  HISTORICAL_TEAMS,
  playersOfTeam,
} from "@/lib/content/teams";
import { hasLegend } from "@/lib/content/legendary";
import { SIM_LINE_OF } from "@/lib/engine/positions";
import type { Rng } from "@/lib/engine/rng";
import type {
  AiPersonality,
  Era,
  HistoricalDepth,
  HistoricalTeam,
  Line,
  Player,
} from "@/lib/types";

/**
 * SYSTEME DE DRAFT (PRD Tome 1 section 10, Tome 2 section 5).
 * "Le hasard est le coeur du gameplay. Le joueur ne peut jamais choisir
 *  librement un joueur." Le systeme tire une equipe, le joueur choisit UN
 *  joueur, puis un nouveau tirage apparait. "Les contraintes creent les
 *  souvenirs."
 */

const DEPTH_ORDER: Era[] = ["MODERNE", "E2015", "E2010", "E2007", "E2003"];

const DEPTH_TO_DEEPEST: Record<HistoricalDepth, Era> = {
  MODERNE: "MODERNE",
  DEPUIS_2015: "E2015",
  DEPUIS_2010: "E2010",
  DEPUIS_2007: "E2007",
  TOUTE_HISTOIRE: "E2003",
};

export function versionsForDepth(depth: HistoricalDepth): Era[] {
  const deepest = DEPTH_TO_DEEPEST[depth];
  const maxIndex = DEPTH_ORDER.indexOf(deepest);
  return DEPTH_ORDER.slice(0, maxIndex + 1);
}

export function teamsForDepth(depth: HistoricalDepth): HistoricalTeam[] {
  const allowed = new Set(versionsForDepth(depth));
  const teams = HISTORICAL_TEAMS.filter((t) => allowed.has(t.era));
  // Fallback: if a depth excludes every seeded team, return everything so the
  // draft is never empty in the MVP content set.
  return teams.length > 0 ? teams : HISTORICAL_TEAMS;
}

/** Step 1 of the draft: the system draws a historical team. */
export function drawTeam(rng: Rng, depth: HistoricalDepth): HistoricalTeam {
  return rng.pick(teamsForDepth(depth));
}

/** Target squad shape: 11 starters + 5 subs (Tome 1 section 11). */
export const SQUAD_SIZE = 16;

const LINE_TARGETS: Record<Line, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  ATK: 4,
};

function lineCounts(squad: Player[]): Record<Line, number> {
  const counts: Record<Line, number> = { GK: 0, DEF: 0, MID: 0, ATK: 0 };
  for (const p of squad) counts[SIM_LINE_OF[p.position]]++;
  return counts;
}

/** Which lines still need players, given the current squad. */
export function neededLines(squad: Player[]): Line[] {
  const counts = lineCounts(squad);
  return (Object.keys(LINE_TARGETS) as Line[]).filter(
    (l) => counts[l] < LINE_TARGETS[l]
  );
}

/**
 * AI pick from a drawn team (Tome 2 section 9 — l'IA doit drafter).
 * Personalities weight the choice differently.
 */
export function aiPickFromTeam(
  team: HistoricalTeam,
  currentSquad: Player[],
  personality: AiPersonality,
  rng: Rng,
  ownedIds: Set<string>
): Player {
  const pool = playersOfTeam(team.id).filter((p) => !ownedIds.has(p.id));
  const candidates = pool.length > 0 ? pool : playersOfTeam(team.id);
  const needs = new Set(neededLines(currentSquad));

  const score = (p: Player): number => {
    let s = p.overall;
    const line = SIM_LINE_OF[p.position];
    if (needs.has(line)) s += 12; // fill gaps first
    switch (personality) {
      case "offensive":
        if (line === "ATK" || line === "MID") s += 6;
        break;
      case "conservatrice":
        if (line === "DEF" || line === "GK") s += 6;
        break;
      case "collectionneur":
        if (hasLegend(p.name)) s += 14;
        s += p.potential - p.overall; // loves wonderkids
        break;
      case "equilibree":
      default:
        break;
    }
    return s + rng.float(0, 4);
  };

  return candidates.reduce((best, p) =>
    score(p) > score(best) ? p : best
  );
}

/** Full AI draft: repeatedly draw a team and pick one player. */
export function aiDraftSquad(
  rng: Rng,
  depth: HistoricalDepth,
  personality: AiPersonality
): string[] {
  const squad: Player[] = [];
  const owned = new Set<string>();
  let safety = 0;
  while (squad.length < SQUAD_SIZE && safety < 500) {
    safety++;
    const team = drawTeam(rng, depth);
    const pick = aiPickFromTeam(team, squad, personality, rng, owned);
    if (owned.has(pick.id)) continue; // avoid intra-squad duplicate
    squad.push(pick);
    owned.add(pick.id);
  }
  return squad.map((p) => p.id);
}

/** A human draft draw: the team plus its selectable players. */
export interface DraftDraw {
  team: HistoricalTeam;
  players: Player[];
}

export function makeHumanDraw(
  rng: Rng,
  depth: HistoricalDepth,
  ownedIds: Set<string>
): DraftDraw {
  const team = drawTeam(rng, depth);
  const players = playersOfTeam(team.id);
  // Keep already-owned versions visible but the store will block re-picking.
  void ownedIds;
  return { team, players };
}
