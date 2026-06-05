/**
 * Retro League — domain model.
 * Mirrors the data model of PRD Tome 2 (section 3) but typed for the
 * client-side playable engine. Every historical player version is a distinct
 * entity (Tome 2, section 4 — "Modele Sofifa"): Mbappe Monaco 2017 and
 * Mbappe PSG 2019 are two different `Player`s with two `playerVersionId`s.
 */

/** Positions, French abbreviations as used throughout the PRD. */
export type Position =
  | "G" // Gardien
  | "DC" // Defenseur central
  | "DD" // Lateral droit
  | "DG" // Lateral gauche
  | "MDC" // Milieu defensif
  | "MC" // Milieu central
  | "MOC" // Milieu offensif central
  | "MD" // Milieu droit
  | "MG" // Milieu gauche
  | "BU" // Buteur
  | "AD" // Ailier droit
  | "AG"; // Ailier gauche

export const ALL_POSITIONS: Position[] = [
  "G",
  "DC",
  "DD",
  "DG",
  "MDC",
  "MC",
  "MOC",
  "MD",
  "MG",
  "BU",
  "AD",
  "AG",
];

/** The four lines used by the simulation weighting (Tome 2, section 7). */
export type Line = "GK" | "DEF" | "MID" | "ATK";

export type FormationName = "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "4-3-1-2";

/** A formation is an ordered list of 11 position slots. */
export interface Formation {
  name: FormationName;
  slots: Position[];
}

/** Historical club-season, e.g. "Olympique Lyonnais 2007-08" (Tome 1, section 7). */
export interface HistoricalTeam {
  id: string;
  clubName: string;
  season: string;
  fifaVersion: FifaVersion;
  league: string;
  coach: string;
  finalPosition: number;
  points: number;
  /** Short archival anecdote shown on the draft card. */
  description: string;
  /** Optional special status (Tome 3 — "Saisons mythiques"). */
  mythicTag?: string;
}

export type FifaVersion =
  | "FC26"
  | "FIFA20"
  | "FIFA15"
  | "FIFA10"
  | "FIFA07";

/** Historical depth selectable at league creation (Tome 1, section 9). */
export type HistoricalDepth =
  | "FC26"
  | "FC26_FIFA20"
  | "FC26_FIFA15"
  | "FC26_FIFA10"
  | "FC26_FIFA07";

/** A distinct historical version of a player. */
export interface Player {
  /** Unique version id, e.g. "JUNINHO_OL_2007". */
  id: string;
  name: string;
  position: Position;
  secondaryPositions: Position[];
  overall: number;
  potential: number;
  age: number;
  nationality: string;
  /** Decade bucket for the "Machine a remonter le temps" award. */
  decade: number;
  historicalTeamId: string;
  club: string;
  season: string;
  fifaVersion: FifaVersion;
}

export type AiPersonality =
  | "conservatrice"
  | "offensive"
  | "collectionneur"
  | "equilibree";

export interface Club {
  id: string;
  name: string;
  isAI: boolean;
  personality?: AiPersonality;
  /** Player version ids owned by this club. */
  squad: string[];
  /** Starting XI + bench assignment. */
  lineup: LineupEntry[];
  formation: FormationName;
  /** Running form value in [-1, 1], drifts with results. */
  form: number;
}

export interface LineupEntry {
  playerId: string;
  starter: boolean;
  assignedPosition: Position;
  benchOrder?: number;
}

export type SimulationMode = "rapide" | "validation";

export interface League {
  id: string;
  name: string;
  inviteCode: string;
  simulationMode: SimulationMode;
  historicalDepth: HistoricalDepth;
  status: LeagueStatus;
  currentMatchday: number;
  clubs: Club[];
  fixtures: Fixture[];
  createdAt: number;
}

export type LeagueStatus =
  | "draft"
  | "composition"
  | "season"
  | "mercato"
  | "finished";

export interface Fixture {
  id: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "played";
  events: MatchEvent[];
}

export type MatchEventType =
  | "goal"
  | "legendary"
  | "narrative"
  | "kickoff"
  | "fulltime";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  clubId?: string;
  playerId?: string;
  assistId?: string;
  /** Dynamic narration line (Tome 2, section 11). */
  description: string;
}

/** Legendary Moment definition (Tome 3 — feature signature). */
export interface LegendaryMoment {
  /** Matched against player name (substring, case-insensitive). */
  playerMatch: string;
  archetype: string;
  trigger: LegendaryTrigger;
  /** Flat bonus added to the carrier's effective rating when it fires. */
  bonus: number;
  /** Narration lines, one is picked at random when it fires. */
  narration: string[];
}

export type LegendaryTrigger =
  | "vs_lyon"
  | "big_match"
  | "free_kick"
  | "decisive"
  | "counter_attack"
  | "stakes"
  | "box"
  | "blocked_match"
  | "level_gap"
  | "set_piece"
  | "end_of_match"
  | "prestige";

export interface Rivalry {
  id: string;
  label: string;
  /** Club name substrings that form the rivalry. */
  a: string;
  b: string;
  intensity: number; // multiplier on event frequency
  narration: string;
}

export interface StandingRow {
  clubId: string;
  clubName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface TradeOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  offered: string[]; // player ids
  requested: string[]; // player ids
  status: "pending" | "accepted" | "rejected";
}
