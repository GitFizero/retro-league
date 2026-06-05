import { getPlayer } from "@/lib/content/teams";
import { autoLineup, teamRating } from "@/lib/engine/composition";
import type { Rng } from "@/lib/engine/rng";
import type { AiPersonality, Club, FormationName } from "@/lib/types";

/**
 * IA DES CLUBS (PRD Tome 1 section 17, Tome 2 section 9).
 * "Le joueur ne doit jamais sentir qu'ils sont passifs." L'IA doit drafter,
 * composer, echanger, jouer. Personnalites : conservatrice, offensive,
 * collectionneur, equilibree.
 */

export const AI_NAMES = [
  "Les Revenants",
  "Galactiques FC",
  "AC Nostalgie",
  "Real Madeleine",
  "Inter Souvenirs",
  "Sporting Retro",
  "Vintage United",
  "Old School CF",
  "FC Madeleine de Proust",
  "Panini All-Stars",
  "Les Increvables",
  "Dynamo Memoire",
  "Atletico Cassette",
  "Borussia VHS",
  "Stade Sepia",
  "Olympique Antan",
  "Racing Madeleine",
];

export const PERSONALITIES: AiPersonality[] = [
  "offensive",
  "conservatrice",
  "collectionneur",
  "equilibree",
];

export function formationForPersonality(
  personality: AiPersonality
): FormationName {
  switch (personality) {
    case "offensive":
      return "4-3-3";
    case "conservatrice":
      return "4-2-3-1";
    case "collectionneur":
      return "3-5-2";
    case "equilibree":
    default:
      return "4-4-2";
  }
}

/**
 * AI accepts a trade only if it does not lose squad rating (Tome 1 section 14 —
 * uniquement des echanges, pas d'argent). "Les deux joueurs doivent accepter."
 */
export function evaluateTradeForClub(
  club: Club,
  giveAwayIds: string[],
  receiveIds: string[]
): boolean {
  const before = squadValue(club.squad);
  const nextSquad = [
    ...club.squad.filter((id) => !giveAwayIds.includes(id)),
    ...receiveIds,
  ];
  const after = squadValue(nextSquad);
  // Accept break-even or better; collectors are a touch more eager.
  const threshold = club.personality === "collectionneur" ? -2 : 0;
  return after - before >= threshold;
}

function squadValue(ids: string[]): number {
  return ids.reduce((sum, id) => {
    const p = getPlayer(id);
    return sum + (p ? p.overall : 0);
  }, 0);
}

/**
 * AI proposes a trade to the human: offer a fringe player for a human starter
 * it covets, but only a proposal the human might rationally consider.
 */
export function proposeAiTrade(
  ai: Club,
  human: Club,
  rng: Rng
): { offered: string[]; requested: string[] } | null {
  const aiPlayers = ai.squad
    .map(getPlayer)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => b.overall - a.overall);
  const humanPlayers = human.squad
    .map(getPlayer)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => b.overall - a.overall);

  if (aiPlayers.length < 2 || humanPlayers.length < 1) return null;

  // AI wants one of the human's good players...
  const wanted = rng.pick(humanPlayers.slice(0, 5));
  // ...and offers a player of comparable value so the human may say yes.
  const fair = aiPlayers.find(
    (p) => p.id !== wanted.id && Math.abs(p.overall - wanted.overall) <= 2
  );
  if (!fair) return null;

  return { offered: [fair.id], requested: [wanted.id] };
}

/** Recompute an AI club's lineup using its preferred formation. */
export function refreshAiLineup(club: Club): Club {
  const formation = formationForPersonality(
    club.personality ?? "equilibree"
  );
  return {
    ...club,
    formation,
    lineup: autoLineup(club.squad, formation),
  };
}

export function bestFormationFor(squadIds: string[]): FormationName {
  const options: FormationName[] = [
    "4-4-2",
    "4-3-3",
    "4-2-3-1",
    "3-5-2",
    "4-3-1-2",
  ];
  let best: FormationName = "4-4-2";
  let bestVal = -1;
  for (const f of options) {
    const val = teamRating(autoLineup(squadIds, f));
    if (val > bestVal) {
      bestVal = val;
      best = f;
    }
  }
  return best;
}
