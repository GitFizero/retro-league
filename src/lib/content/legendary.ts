import type { LegendaryMoment, Rivalry } from "@/lib/types";

/**
 * MOMENTS LEGENDAIRES — la feature signature (PRD Tome 1 section 14,
 * Tome 3). "C'est la feature qui doit faire parler du jeu."
 *
 * Matched by player NAME substring, so every historical version of a legend
 * (Payet 2017, Juninho 2007...) inherits its moment.
 */
export const LEGENDARY_MOMENTS: LegendaryMoment[] = [
  {
    playerMatch: "Payet",
    archetype: "ARTISTE",
    trigger: "vs_lyon",
    bonus: 10,
    narration: [
      "Payet decide une nouvelle fois de torturer Lyon.",
      "Payet rappelle pourquoi Marseille l'adore : un geste, et tout bascule.",
      "Coup franc enroule, lucarne. Payet humilie Lyon une fois de plus.",
    ],
  },
  {
    playerMatch: "Payet",
    archetype: "ARTISTE",
    trigger: "big_match",
    bonus: 8,
    narration: [
      "Payet rappelle pourquoi Marseille l'adore.",
      "Dans les grands rendez-vous, Payet sort le grand jeu.",
    ],
  },
  {
    playerMatch: "Juninho",
    archetype: "TIREUR D'ELITE",
    trigger: "free_kick",
    bonus: 14,
    narration: [
      "Le mur sait deja que c'est termine.",
      "Le mur est la pour la decoration. Juninho arme sa feuille morte.",
      "Juninho marque un coup franc venu d'un autre monde.",
    ],
  },
  {
    playerMatch: "Hazard",
    archetype: "GENIE",
    trigger: "decisive",
    bonus: 10,
    narration: [
      "Hazard danse entre les defenseurs.",
      "Hazard se met sur son pied gauche, et plus personne ne respire.",
      "Trois defenseurs, trois statues. Hazard les a tous effaces.",
    ],
  },
  {
    playerMatch: "Mbappe",
    archetype: "FUSEE",
    trigger: "counter_attack",
    bonus: 11,
    narration: [
      "Les defenseurs savent deja qu'ils sont battus.",
      "Mbappe crucifie la defense sur une acceleration fulgurante.",
      "Lance en profondeur, Mbappe a deja vingt metres d'avance.",
    ],
  },
  {
    playerMatch: "Drogba",
    archetype: "MONSTRE",
    trigger: "stakes",
    bonus: 10,
    narration: [
      "Drogba transforme le match en combat. Et il gagne ses combats.",
      "Un appui, une frappe : Drogba ne tremble jamais dans les grands soirs.",
    ],
  },
  {
    playerMatch: "Pauleta",
    archetype: "RENARD",
    trigger: "box",
    bonus: 9,
    narration: [
      "Une occasion suffit a Pauleta.",
      "Pauleta etait la ou il fallait, comme toujours.",
    ],
  },
  {
    playerMatch: "Ben Arfa",
    archetype: "CHAOS",
    trigger: "blocked_match",
    bonus: 12,
    narration: [
      "Ben Arfa decide de jouer seul. Et il a raison.",
      "Ben Arfa part de son camp, elimine la moitie de l'equipe et conclut.",
    ],
  },
  {
    playerMatch: "Ibrahimovic",
    archetype: "ROI",
    trigger: "level_gap",
    bonus: 12,
    narration: [
      "Zlatan considere ce match comme son terrain d'entrainement.",
      "Zlatan rappelle qui est le patron, d'un geste impossible.",
    ],
  },
  {
    playerMatch: "Gourcuff",
    archetype: "ARTISTE",
    trigger: "prestige",
    bonus: 9,
    narration: [
      "Pendant quelques instants, Bordeaux redevient magique.",
      "Gourcuff caresse le ballon comme au printemps 2009.",
    ],
  },
  {
    playerMatch: "Nene",
    archetype: "MAGICIEN",
    trigger: "set_piece",
    bonus: 9,
    narration: ["Nene depose le ballon et signe un chef-d'oeuvre."],
  },
  {
    playerMatch: "Niang",
    archetype: "GUERRIER",
    trigger: "big_match",
    bonus: 8,
    narration: ["Niang plante les crampons et arrache le but du guerrier."],
  },
  {
    playerMatch: "Lopez",
    archetype: "TUEUR",
    trigger: "end_of_match",
    bonus: 9,
    narration: ["En fin de match, Lisandro Lopez ne pardonne jamais."],
  },
];

/**
 * RIVALITES HISTORIQUES (Tome 3). Ces matchs augmentent l'intensite et la
 * frequence des moments speciaux.
 */
export const RIVALRIES: Rivalry[] = [
  {
    id: "le_classique",
    label: "Le Classique",
    a: "Marseille",
    b: "Paris",
    intensity: 1.2,
    narration: "Le Velodrome est en fusion.",
  },
  {
    id: "derby_rhone",
    label: "Derby du Rhone",
    a: "Lyon",
    b: "Saint-Etienne",
    intensity: 1.15,
    narration: "Ce match vaut plus que trois points.",
  },
  {
    id: "derby_nord",
    label: "Derby du Nord",
    a: "Lens",
    b: "Lille",
    intensity: 1.15,
    narration: "Toute une region retient son souffle.",
  },
  {
    id: "derby_cote_azur",
    label: "Derby de la Cote d'Azur",
    a: "Nice",
    b: "Monaco",
    intensity: 1.1,
    narration: "La Cote d'Azur s'embrase le temps d'un soir.",
  },
];

export function findRivalry(
  homeName: string,
  awayName: string
): Rivalry | undefined {
  return RIVALRIES.find(
    (r) =>
      (homeName.includes(r.a) && awayName.includes(r.b)) ||
      (homeName.includes(r.b) && awayName.includes(r.a))
  );
}

/** Returns the legendary moments attached to a player by name. */
export function momentsForPlayer(playerName: string): LegendaryMoment[] {
  return LEGENDARY_MOMENTS.filter((m) =>
    playerName.toLowerCase().includes(m.playerMatch.toLowerCase())
  );
}

export function hasLegend(playerName: string): boolean {
  return momentsForPlayer(playerName).length > 0;
}
