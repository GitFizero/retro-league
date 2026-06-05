import { getPlayer } from "@/lib/content/teams";
import {
  FORMATIONS,
  SIM_LINE_OF,
  positionCoefficient,
} from "@/lib/engine/positions";
import type {
  FormationName,
  Line,
  LineupEntry,
  Player,
  Position,
} from "@/lib/types";

/**
 * CONSTRUCTION D'EQUIPE (PRD Tome 1 section 11, Tome 2 section 6).
 * 11 titulaires + 5 remplacants. Joueur hors poste => malus via coefficient.
 */

/** Effective contribution of a player at an assigned position. */
export function effectiveRating(
  player: Player,
  assigned: Position
): number {
  const positions = [player.position, ...player.secondaryPositions];
  return player.overall * positionCoefficient(assigned, positions);
}

/**
 * Greedily build the best possible XI for a formation from a squad.
 * For each slot we assign the remaining player with the highest effective
 * rating at that slot's position.
 */
export function autoLineup(
  squadIds: string[],
  formation: FormationName
): LineupEntry[] {
  const slots = FORMATIONS[formation].slots;
  const squad = squadIds
    .map(getPlayer)
    .filter((p): p is Player => Boolean(p));

  const used = new Set<string>();
  const entries: LineupEntry[] = [];

  for (const slotPos of slots) {
    let best: Player | undefined;
    let bestVal = -1;
    for (const p of squad) {
      if (used.has(p.id)) continue;
      const val = effectiveRating(p, slotPos);
      if (val > bestVal) {
        bestVal = val;
        best = p;
      }
    }
    if (best) {
      used.add(best.id);
      entries.push({
        playerId: best.id,
        starter: true,
        assignedPosition: slotPos,
      });
    }
  }

  // Bench: remaining players, capped at 5.
  let benchOrder = 0;
  for (const p of squad) {
    if (used.has(p.id)) continue;
    if (benchOrder >= 5) break;
    entries.push({
      playerId: p.id,
      starter: false,
      assignedPosition: p.position,
      benchOrder: benchOrder++,
    });
  }

  return entries;
}

export interface LineStrength {
  GK: number;
  DEF: number;
  MID: number;
  ATK: number;
}

/** Average effective rating per line for the starting XI. */
export function lineStrengths(lineup: LineupEntry[]): LineStrength {
  const totals: Record<Line, number> = { GK: 0, DEF: 0, MID: 0, ATK: 0 };
  const counts: Record<Line, number> = { GK: 0, DEF: 0, MID: 0, ATK: 0 };

  for (const entry of lineup) {
    if (!entry.starter) continue;
    const player = getPlayer(entry.playerId);
    if (!player) continue;
    const line = SIM_LINE_OF[entry.assignedPosition];
    totals[line] += effectiveRating(player, entry.assignedPosition);
    counts[line]++;
  }

  const avg = (l: Line) => (counts[l] > 0 ? totals[l] / counts[l] : 55);
  return {
    GK: avg("GK"),
    DEF: avg("DEF"),
    MID: avg("MID"),
    ATK: avg("ATK"),
  };
}

/**
 * Overall team rating from the weighted lines (Tome 2 section 7):
 * Gardien 20%, Defense 25%, Milieu 25%, Attaque 30%.
 */
export function teamRating(lineup: LineupEntry[]): number {
  const s = lineStrengths(lineup);
  return s.GK * 0.2 + s.DEF * 0.25 + s.MID * 0.25 + s.ATK * 0.3;
}

/** Starters that are out of position (coefficient < 1) — for UI warnings. */
export function outOfPositionWarnings(lineup: LineupEntry[]): string[] {
  const warnings: string[] = [];
  for (const entry of lineup) {
    if (!entry.starter) continue;
    const player = getPlayer(entry.playerId);
    if (!player) continue;
    const positions = [player.position, ...player.secondaryPositions];
    const coef = positionCoefficient(entry.assignedPosition, positions);
    if (coef < 1) {
      warnings.push(
        `${player.name} joue ${entry.assignedPosition} (${Math.round(
          coef * 100
        )}%)`
      );
    }
  }
  return warnings;
}
