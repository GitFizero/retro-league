import type { Rng } from "@/lib/engine/rng";

/**
 * SYSTEME NARRATIF (PRD Tome 2 section 11, Tome 1 section 16).
 * "Le championnat ne doit pas ressembler a Excel." Jamais "but minute 84",
 * toujours une phrase. Variables : joueur, club, minute, contexte.
 */

export interface NarrationContext {
  scorer: string;
  assist?: string;
  club: string;
  minute: number;
  rng: Rng;
}

const GOAL_LINES: ((c: NarrationContext) => string)[] = [
  (c) => `${c.scorer} crucifie la defense d'une frappe imparable.`,
  (c) => `${c.scorer} surgit au bon moment et ne laisse aucune chance au gardien.`,
  (c) => `Quelle finition de ${c.scorer} ! Le ${c.club} exulte.`,
  (c) => `${c.scorer} ajuste le gardien avec un sang-froid de tueur.`,
  (c) => `Reprise de volee de ${c.scorer}, le ballon file dans la lucarne.`,
  (c) => `${c.scorer} efface son vis-a-vis et conclut du gauche.`,
  (c) => `Coup de tete rageur de ${c.scorer} sur corner.`,
  (c) => `${c.scorer} prend tout le monde de vitesse et pousse le ballon au fond.`,
];

const GOAL_LINES_WITH_ASSIST: ((c: NarrationContext) => string)[] = [
  (c) => `${c.assist} renverse le jeu pour ${c.scorer} qui ne se fait pas prier.`,
  (c) => `Une-deux limpide entre ${c.assist} et ${c.scorer}, but du ${c.club} !`,
  (c) => `Centre millimetre de ${c.assist}, ${c.scorer} n'a plus qu'a pousser.`,
  (c) => `${c.assist} sert ${c.scorer} dans la course, finition parfaite.`,
  (c) => `Ouverture lumineuse de ${c.assist}, ${c.scorer} conclut l'action.`,
];

export function narrateGoal(c: NarrationContext): string {
  const lines = c.assist ? GOAL_LINES_WITH_ASSIST : GOAL_LINES;
  return c.rng.pick(lines)(c);
}

/**
 * EVENEMENTS NARRATIFS (Tome 3) — pas forcement lies a un joueur.
 */
export interface NarrativeEvent {
  id: string;
  label: string;
  line: string;
}

export const NARRATIVE_EVENTS: Record<string, NarrativeEvent> = {
  heist: {
    id: "heist",
    label: "Le Braquage",
    line: "Un hold-up parfait : domines tout le match, ils repartent avec les trois points.",
  },
  comeback: {
    id: "comeback",
    label: "Le Retour Impossible",
    line: "Personne n'aurait parie un euro sur eux. Et pourtant, quel renversement.",
  },
  wall: {
    id: "wall",
    label: "Le Mur",
    line: "Le gardien est devenu infranchissable. Un recital.",
  },
  ac: {
    id: "ac",
    label: "La Climatisation",
    line: "But a l'exterieur dans le money time : le stade s'est soudainement tu.",
  },
};

export const KICKOFF_LINES = [
  "Coup d'envoi. L'ambiance est electrique.",
  "Les deux equipes entrent sur la pelouse, le public gronde.",
  "C'est parti, place au football.",
];
