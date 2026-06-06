/**
 * Retro League — domain model.
 * Mirrors the data model of PRD Tome 2 (section 3) but typed for the
 * client-side playable engine. Every historical player version is a distinct
 * entity (Tome 2, section 4 — "versioning par saison"): Mbappe Monaco 2017 and
 * Mbappe Paris 2019 are two different `Player`s with two `playerVersionId`s.
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
  era: Era;
  league: string;
  coach: string;
  finalPosition: number;
  points: number;
  /** Short archival anecdote shown on the draft card. */
  description: string;
  /** Optional special status (Tome 3 — "Saisons mythiques"). */
  mythicTag?: string;
}

/**
 * Neutral "era" buckets, by season start-year band. These are our own
 * identifiers (no third-party branding) used to gate the historical depth.
 */
export type Era =
  | "MODERNE" // saison actuelle
  | "E2015" // 2014-2019
  | "E2010" // 2010-2013
  | "E2007" // 2006-2009
  | "E2003"; // 2002-2005

/** Historical depth selectable at league creation (Tome 1, section 9). */
export type HistoricalDepth =
  | "MODERNE"
  | "DEPUIS_2015"
  | "DEPUIS_2010"
  | "DEPUIS_2007"
  | "TOUTE_HISTOIRE";

/** A distinct historical version of a player. */
export interface Player {
  /** Unique version id, e.g. "JUNINHO_LYON_2007". */
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
  era: Era;
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
  /** Cumulative points deduction (DNCG & co.) applied to the standings. */
  pointsPenalty?: number;
  /** If set, the club forfeits its next match (greve du bus...). */
  forfeitNext?: boolean;
  /** Player id (in squad) who has handed in a transfer request. */
  wantaway?: string;
}

/** Off-pitch incident applied between matchdays (les "Faits Divers"). */
export interface NewsItem {
  id: string;
  matchday: number;
  clubId: string;
  clubName: string;
  kind: string;
  title: string;
  text: string;
}

export interface LineupEntry {
  playerId: string;
  starter: boolean;
  assignedPosition: Position;
  benchOrder?: number;
}

export type SimulationMode = "rapide" | "validation";

export type ClubPool = "all" | "top10";

export interface League {
  id: string;
  name: string;
  inviteCode: string;
  simulationMode: SimulationMode;
  historicalDepth: HistoricalDepth;
  /** Which historical squads feed the wheel. */
  clubPool: ClubPool;
  /** Human drafts 11 + 5 subs when true, else the XI only. */
  withSubs: boolean;
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

export type FixtureStatusValue = "scheduled" | "played";

export interface Fixture {
  id: string;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatusValue;
  events: MatchEvent[];
}

export type MatchEventType =
  | "goal"
  | "legendary"
  | "narrative"
  | "card"
  | "incident"
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
  /** For card events. */
  card?: "yellow" | "red";
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

export type TradeStatusValue = "pending" | "accepted" | "rejected";

export interface TradeOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  offered: string[]; // player ids
  requested: string[]; // player ids
  status: TradeStatusValue;
}
