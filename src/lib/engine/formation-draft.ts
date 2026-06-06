import { playersOfTeam } from "@/lib/content/teams";
import { hasLegend } from "@/lib/content/legendary";
import {
  FORMATIONS,
  positionCoefficient,
  SIM_LINE_OF,
} from "@/lib/engine/positions";
import { drawTeam } from "@/lib/engine/draft";
import type { Rng } from "@/lib/engine/rng";
import type {
  AiPersonality,
  Club,
  ClubPool,
  FormationName,
  HistoricalDepth,
  LineupEntry,
  Player,
  Position,
} from "@/lib/types";

export const BENCH_SIZE = 5;

/**
 * DRAFT CONTRAINT PAR LA FORMATION (facon 38-0).
 * On ne drafte pas 16 joueurs au hasard : on remplit EXACTEMENT les 11 postes
 * de la formation choisie. Quand les 2 postes de DC d'un 4-4-2 sont pris, on ne
 * peut plus prendre de DC. Un joueur est selectionnable s'il peut tenir (a 90%
 * minimum : poste naturel ou proche) un poste encore libre.
 */

/** Seuil d'eligibilite : poste naturel (100%) ou proche (90%). */
export const ELIGIBLE = 0.9;

function positionsOf(p: Player): Position[] {
  return [p.position, ...p.secondaryPositions];
}

export function slotCoefficient(player: Player, slot: Position): number {
  return positionCoefficient(slot, positionsOf(player));
}

/** Number of slots per position for a formation (e.g. 4-4-2 -> DC:2, BU:2...). */
export function formationNeeds(formation: FormationName): Position[] {
  return [...FORMATIONS[formation].slots];
}

/** Slots still open, given the positions already assigned. */
export function remainingSlots(
  assignedPositions: Position[],
  formation: FormationName
): Position[] {
  const slots = formationNeeds(formation);
  for (const pos of assignedPositions) {
    const idx = slots.indexOf(pos);
    if (idx >= 0) slots.splice(idx, 1);
  }
  return slots;
}

/**
 * Best still-open slot the player can fill, else null.
 *
 * Hard rule (facon 38-0) : un joueur ne peut remplir qu'un poste de SA LIGNE
 * (gardien / defense / milieu / attaque). On garde la souplesse laterale a
 * l'interieur d'une ligne (un DC peut couvrir DD/DG) mais un attaquant ne
 * descend jamais au milieu : le nombre de joueurs par ligne colle donc
 * exactement a la formation choisie.
 */
export function slotForPlayer(
  player: Player,
  remaining: Position[]
): Position | null {
  const playerLines = new Set(positionsOf(player).map((p) => SIM_LINE_OF[p]));
  let best: Position | null = null;
  let bestCoef = ELIGIBLE - 1e-6;
  for (const slot of remaining) {
    if (!playerLines.has(SIM_LINE_OF[slot])) continue; // ligne differente -> non
    const c = slotCoefficient(player, slot);
    if (c > bestCoef) {
      bestCoef = c;
      best = slot;
    }
  }
  return best;
}

export function isPickable(
  player: Player,
  remaining: Position[],
  owned: Set<string>
): boolean {
  return !owned.has(player.id) && slotForPlayer(player, remaining) !== null;
}

/** Human-readable summary of what's left to draft, e.g. "2 DC · 1 BU". */
export function remainingSummary(remaining: Position[]): { pos: Position; n: number }[] {
  const counts = new Map<Position, number>();
  for (const p of remaining) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([pos, n]) => ({ pos, n }));
}

// ------------------------------------------------ human draft phase (XI/bench)

export type DraftStep =
  | { kind: "xi"; remaining: Position[] }
  | { kind: "bench"; benchIndex: number }
  | { kind: "done" };

/** Where the human draft stands: still filling the XI, then optional subs. */
export function nextDraftStep(club: Club, withSubs: boolean): DraftStep {
  const starters = club.lineup.filter((e) => e.starter);
  const xiSize = formationNeeds(club.formation).length;
  if (starters.length < xiSize) {
    return {
      kind: "xi",
      remaining: remainingSlots(
        starters.map((e) => e.assignedPosition),
        club.formation
      ),
    };
  }
  const benchCount = club.lineup.length - starters.length;
  if (withSubs && benchCount < BENCH_SIZE) {
    return { kind: "bench", benchIndex: benchCount };
  }
  return { kind: "done" };
}

export function draftTarget(formation: FormationName, withSubs: boolean): number {
  return formationNeeds(formation).length + (withSubs ? BENCH_SIZE : 0);
}

/** Can this drawn player be picked right now? (XI = slot fit, bench = any). */
export function draftPickable(
  player: Player,
  club: Club,
  withSubs: boolean,
  owned: Set<string>
): boolean {
  if (owned.has(player.id)) return false;
  const step = nextDraftStep(club, withSubs);
  if (step.kind === "xi") return slotForPlayer(player, step.remaining) !== null;
  if (step.kind === "bench") return true;
  return false;
}

// --------------------------------------------------------------- AI draft ---

function aiScore(p: Player, personality: AiPersonality, rng: Rng): number {
  let s = p.overall;
  if (personality === "collectionneur" && hasLegend(p.name)) s += 14;
  return s + rng.float(0, 4);
}

/**
 * AI fills its formation slot by slot. Returns the squad ids and the matching
 * lineup (all starters, no bench — it's an exact XI).
 */
export function aiDraftFormation(
  rng: Rng,
  depth: HistoricalDepth,
  personality: AiPersonality,
  formation: FormationName,
  pool: ClubPool = "all"
): { squad: string[]; lineup: LineupEntry[] } {
  const total = formationNeeds(formation).length;
  const assigned: Position[] = [];
  const squad: string[] = [];
  const lineup: LineupEntry[] = [];
  const owned = new Set<string>();

  const place = (p: Player, slot: Position) => {
    squad.push(p.id);
    owned.add(p.id);
    assigned.push(slot);
    lineup.push({ playerId: p.id, starter: true, assignedPosition: slot });
  };

  let safety = 0;
  while (lineup.length < total && safety < 600) {
    safety++;
    const remaining = remainingSlots(assigned, formation);
    const team = drawTeam(rng, depth, pool);
    const candidates = playersOfTeam(team.id).filter(
      (p) => !owned.has(p.id) && slotForPlayer(p, remaining) !== null
    );
    if (candidates.length === 0) continue;
    const pick = candidates.reduce((best, p) =>
      aiScore(p, personality, rng) > aiScore(best, personality, rng) ? p : best
    );
    place(pick, slotForPlayer(pick, remaining)!);
  }

  // Robustness fallback: if eligibility left a slot unfilled, drop the 90%
  // constraint so the XI is always complete.
  let guard = 0;
  while (lineup.length < total && guard < 600) {
    guard++;
    const remaining = remainingSlots(assigned, formation);
    const team = drawTeam(rng, depth, pool);
    const candidate = playersOfTeam(team.id).find((p) => !owned.has(p.id));
    if (candidate) place(candidate, remaining[0]);
  }

  return { squad, lineup };
}
