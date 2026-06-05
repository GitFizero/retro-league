import { ALL_PLAYERS } from "@/lib/content/teams";
import type { Player } from "@/lib/types";

/**
 * COLLECTIONS CACHEES & RECOMPENSES (PRD Tome 1 section 19, Tome 3).
 * Owning a specific set of legends unlocks a hidden collection.
 */
export interface Collection {
  id: string;
  name: string;
  /** Player name substrings that must all be present in the squad. */
  required: string[];
  flavor: string;
}

export const COLLECTIONS: Collection[] = [
  {
    id: "ol_dynasty",
    name: "OL Dynasty",
    required: ["Juninho", "Govou", "Cris", "Toulalan", "Benzema"],
    flavor: "Le Lyon des sept titres reuni sous un meme maillot.",
  },
  {
    id: "lille_champion",
    name: "Lille Champion",
    required: ["Hazard", "Sow", "Cabaye", "Rami"],
    flavor: "Le double de 2011, ressuscite.",
  },
  {
    id: "monaco_2017",
    name: "Monaco 2017",
    required: ["Mbappe", "Falcao", "Fabinho", "Bernardo Silva", "Mendy"],
    flavor: "La fusee monegasque au complet.",
  },
  {
    id: "monaco_2004",
    name: "Monaco 2004",
    required: ["Giuly", "Morientes", "Rothen", "Evra"],
    flavor: "L'epopee europeenne, du Real a la finale, reconstituee.",
  },
  {
    id: "ol_galactique",
    name: "OL Galactique",
    required: ["Juninho", "Malouda", "Wiltord", "Govou"],
    flavor: "Le Lyon flamboyant du milieu des annees 2000.",
  },
  {
    id: "psg_pre_qatar",
    name: "PSG Pre-Qatar",
    required: ["Nene", "Hoarau", "Sakho", "Giuly"],
    flavor: "Le dernier Paris romantique, juste avant la revolution.",
  },
  {
    id: "om_phoceen",
    name: "OM Phoceen",
    required: ["Valbuena", "Gignac", "Remy", "Ayew"],
    flavor: "Le Velodrome des annees Deschamps, Petit Velo en chef d'orchestre.",
  },
];

/** SUCCES (Tome 1 section 19). */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (squad: Player[], seasonsPlayed: number) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "puriste",
    name: "Puriste",
    description: "Une equipe composee uniquement de joueurs d'avant 2010.",
    check: (squad) =>
      squad.length >= 11 &&
      squad.every((p) => parseInt(p.season.slice(0, 4), 10) < 2010),
  },
  {
    id: "collectionneur",
    name: "Collectionneur",
    description: "10 saisons jouees.",
    check: (_squad, seasons) => seasons >= 10,
  },
  {
    id: "time_machine",
    name: "Machine a remonter le temps",
    description: "Posseder un joueur de chaque decennie disponible.",
    check: (squad) => {
      const available = new Set(ALL_PLAYERS.map((p) => p.decade));
      const owned = new Set(squad.map((p) => p.decade));
      return [...available].every((d) => owned.has(d));
    },
  },
];

export function unlockedCollections(squad: Player[]): Collection[] {
  const names = squad.map((p) => p.name.toLowerCase());
  return COLLECTIONS.filter((col) =>
    col.required.every((req) =>
      names.some((n) => n.includes(req.toLowerCase()))
    )
  );
}

export function unlockedAchievements(
  squad: Player[],
  seasonsPlayed: number
): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(squad, seasonsPlayed));
}
