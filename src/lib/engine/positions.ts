import type { Formation, FormationName, Line, Position } from "@/lib/types";

/**
 * Position geometry used to compute "hors poste" malus (PRD Tome 1 section 11,
 * Tome 2 section 6). Each position has a vertical line and a lateral lane.
 */
const LINE_OF: Record<Position, number> = {
  G: 0,
  DC: 1,
  DD: 1,
  DG: 1,
  MDC: 2,
  MC: 2,
  MOC: 2,
  MD: 2,
  MG: 2,
  BU: 3,
  AD: 3,
  AG: 3,
};

// lane: -1 left, 0 center, +1 right
const LANE_OF: Record<Position, number> = {
  G: 0,
  DC: 0,
  DD: 1,
  DG: -1,
  MDC: 0,
  MC: 0,
  MOC: 0,
  MD: 1,
  MG: -1,
  BU: 0,
  AD: 1,
  AG: -1,
};

export const SIM_LINE_OF: Record<Position, Line> = {
  G: "GK",
  DC: "DEF",
  DD: "DEF",
  DG: "DEF",
  MDC: "MID",
  MC: "MID",
  MOC: "MID",
  MD: "MID",
  MG: "MID",
  BU: "ATK",
  AD: "ATK",
  AG: "ATK",
};

export const POSITION_LABEL: Record<Position, string> = {
  G: "Gardien",
  DC: "Defenseur central",
  DD: "Lateral droit",
  DG: "Lateral gauche",
  MDC: "Milieu defensif",
  MC: "Milieu central",
  MOC: "Milieu offensif",
  MD: "Milieu droit",
  MG: "Milieu gauche",
  BU: "Buteur",
  AD: "Ailier droit",
  AG: "Ailier gauche",
};

/**
 * Coefficient applied to a player's overall when fielded out of position.
 *   Poste naturel : 100%
 *   Poste proche  :  90%
 *   Poste eloigne :  75%
 *   Poste aberrant:  50%
 * A goalkeeper anywhere but in goal (and vice-versa) is always aberrant.
 */
export function positionCoefficient(
  assigned: Position,
  playerPositions: Position[]
): number {
  if (playerPositions.includes(assigned)) return 1;

  const assignedIsGk = assigned === "G";
  const best = playerPositions.reduce((acc, p) => {
    const c = pairCoefficient(assigned, p, assignedIsGk);
    return c > acc ? c : acc;
  }, 0);
  return best;
}

function pairCoefficient(
  a: Position,
  b: Position,
  assignedIsGk: boolean
): number {
  const bIsGk = b === "G";
  // Keeper outfield mismatch is always the worst case.
  if (assignedIsGk !== bIsGk) return 0.5;
  if (assignedIsGk && bIsGk) return 1;

  const lineDiff = Math.abs(LINE_OF[a] - LINE_OF[b]);
  // Two lines apart (e.g. BU en DC) is a "tres gros malus" — aberrant.
  if (lineDiff >= 2) return 0.5;

  const laneDiff = Math.abs(LANE_OF[a] - LANE_OF[b]);
  const dist = lineDiff + laneDiff;
  if (dist <= 1) return 0.9; // poste proche
  if (dist === 2) return 0.75; // poste eloigne
  return 0.5; // aberrant
}

export const FORMATIONS: Record<FormationName, Formation> = {
  "4-4-2": {
    name: "4-4-2",
    slots: ["G", "DD", "DC", "DC", "DG", "MD", "MC", "MC", "MG", "BU", "BU"],
  },
  "4-3-3": {
    name: "4-3-3",
    slots: ["G", "DD", "DC", "DC", "DG", "MDC", "MC", "MC", "AD", "BU", "AG"],
  },
  "4-2-3-1": {
    name: "4-2-3-1",
    slots: ["G", "DD", "DC", "DC", "DG", "MDC", "MDC", "MD", "MOC", "MG", "BU"],
  },
  "3-5-2": {
    name: "3-5-2",
    slots: ["G", "DC", "DC", "DC", "MD", "MC", "MDC", "MC", "MG", "BU", "BU"],
  },
  "4-3-1-2": {
    name: "4-3-1-2",
    slots: ["G", "DD", "DC", "DC", "DG", "MDC", "MC", "MC", "MOC", "BU", "BU"],
  },
};

export const ALL_FORMATIONS = Object.values(FORMATIONS);
