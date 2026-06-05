import type { Player, Position } from "@/lib/types";
import type { Rng } from "@/lib/engine/rng";

/**
 * Jeunes du centre de formation — joueurs 100% FICTIFS (aucun nom reel),
 * note ~60, utilises pour remplacer un joueur qui part (Fenerbahce, suspension,
 * etc.). Ils vivent dans le lookup getPlayer mais ne sont JAMAIS dans le pool
 * de draft. Noms inventes et clairement folkloriques (touche humoristique).
 */

// Noms FICTIFS mais credibles (aucun joueur reel). Combinaisons d'une douzaine
// de prenoms et de noms de famille francais courants.
const FIRST = [
  "Lucas", "Theo", "Enzo", "Nathan", "Mathis", "Hugo",
  "Tom", "Noah", "Evan", "Maxime", "Quentin", "Bilal",
];
const LAST = [
  "Lemoine", "Vasseur", "Carpentier", "Delattre", "Brunel", "Marechal",
  "Pithon", "Sauvage", "Charrier", "Lemaire", "Boucher", "Aubert",
];

function youthName(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + 3) % LAST.length]}`;
}

const SPREAD: Position[] = [
  "G", "G",
  "DC", "DC", "DD", "DG",
  "MDC", "MC", "MC", "MOC", "MD", "MG",
  "BU", "BU", "AD", "AG",
];

export const YOUTH_PLAYERS: Player[] = SPREAD.map((pos, i) => {
  const overall = 58 + (i % 5); // 58-62
  return {
    id: `YOUTH_${pos}_${i}`,
    name: youthName(i),
    position: pos,
    secondaryPositions: [],
    overall,
    potential: 80 + (i % 12), // un espoir... peut-etre
    age: 17 + (i % 3),
    nationality: "France",
    decade: 2020,
    historicalTeamId: "CENTRE_FORMATION",
    club: "Centre de Formation",
    season: "Espoir",
    era: "MODERNE",
  };
});

/** Pick a youth for a given position (or any), avoiding ids already owned. */
export function pickYouth(
  rng: Rng,
  position: Position,
  owned: Set<string>
): Player {
  const samePos = YOUTH_PLAYERS.filter(
    (y) => y.position === position && !owned.has(y.id)
  );
  const pool =
    samePos.length > 0
      ? samePos
      : YOUTH_PLAYERS.filter((y) => !owned.has(y.id));
  if (pool.length === 0) return rng.pick(YOUTH_PLAYERS);
  return rng.pick(pool);
}
