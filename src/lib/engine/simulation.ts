import { getPlayer } from "@/lib/content/teams";
import { shortName } from "@/lib/format";
import { findRivalry, momentsForPlayer } from "@/lib/content/legendary";
import {
  NARRATIVE_EVENTS,
  narrateGoal,
} from "@/lib/content/narration";
import {
  BRAWL_LINES,
  INVASION_LINES,
  RED_CARD_LINES,
  YELLOW_CARD_LINES,
  renderText,
} from "@/lib/content/events";
import { lineStrengths, teamRating } from "@/lib/engine/composition";
import { Rng } from "@/lib/engine/rng";
import type {
  Club,
  LegendaryMoment,
  LegendaryTrigger,
  LineupEntry,
  MatchEvent,
  Player,
  Position,
  Rivalry,
} from "@/lib/types";

/**
 * ALGORITHME DE SIMULATION (PRD Tome 2 section 7).
 * "Resultats credibles. Pas totalement aleatoires. Pas totalement
 *  previsibles." Avantage domicile +3%, forme +/-5%, moment legendaire +10%,
 *  aleatoire +/-15%.
 */

export interface MatchContext {
  matchday: number;
  totalMatchdays: number;
  /** Optional seed override for reproducibility. */
  seed?: number | string;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeFormAfter: number;
  awayFormAfter: number;
  rivalry?: Rivalry;
}

const ATTACK_WEIGHT: Record<Position, number> = {
  G: 0.02,
  DC: 0.12,
  DD: 0.2,
  DG: 0.2,
  MDC: 0.25,
  MC: 0.45,
  MOC: 0.7,
  MD: 0.55,
  MG: 0.55,
  BU: 1.0,
  AD: 0.85,
  AG: 0.85,
};

function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** A legend whose trigger is satisfied this match. */
interface ArmedLegend {
  player: Player;
  moment: LegendaryMoment;
}

/**
 * Match-level triggers we can resolve up front from the context.
 * Situational triggers (free kicks, counters...) are rolled per goal.
 */
function matchLevelTriggers(
  opponentName: string,
  isBigMatch: boolean,
  isLate: boolean,
  levelGap: boolean,
  hasRivalry: boolean
): Set<LegendaryTrigger> {
  const t = new Set<LegendaryTrigger>();
  if (opponentName.includes("Lyon")) t.add("vs_lyon");
  if (isBigMatch) {
    t.add("big_match");
    t.add("stakes");
    t.add("prestige");
  }
  if (isLate) t.add("decisive");
  if (levelGap) t.add("level_gap");
  if (hasRivalry) {
    t.add("big_match");
    t.add("decisive");
    t.add("stakes");
  }
  return t;
}

const SITUATIONAL: LegendaryTrigger[] = [
  "free_kick",
  "counter_attack",
  "box",
  "blocked_match",
  "set_piece",
  "end_of_match",
];

function armedLegends(
  lineup: LineupEntry[],
  matchTriggers: Set<LegendaryTrigger>,
  rng: Rng
): ArmedLegend[] {
  const armed: ArmedLegend[] = [];
  for (const entry of lineup) {
    if (!entry.starter) continue;
    const player = getPlayer(entry.playerId);
    if (!player) continue;
    const moments = momentsForPlayer(player.name);
    for (const moment of moments) {
      const fires =
        matchTriggers.has(moment.trigger) ||
        (SITUATIONAL.includes(moment.trigger) && rng.bool(0.5));
      if (fires) armed.push({ player, moment });
    }
  }
  return armed;
}

function starters(lineup: LineupEntry[]): {
  player: Player;
  assigned: Position;
}[] {
  const out: { player: Player; assigned: Position }[] = [];
  for (const e of lineup) {
    if (!e.starter) continue;
    const p = getPlayer(e.playerId);
    if (p) out.push({ player: p, assigned: e.assignedPosition });
  }
  return out;
}

export function simulateFixture(
  home: Club,
  away: Club,
  ctx: MatchContext
): MatchResult {
  const seed =
    ctx.seed ?? `${home.id}-${away.id}-${ctx.matchday}-${home.squad.length}`;
  const rng = new Rng(seed);

  const homeBase = teamRating(home.lineup);
  const awayBase = teamRating(away.lineup);

  const rivalry = findRivalry(home.name, away.name);
  const isBigMatch =
    (homeBase >= 79 && awayBase >= 79) ||
    Boolean(rivalry) ||
    ctx.matchday > ctx.totalMatchdays - 3;
  const isLate = ctx.matchday > ctx.totalMatchdays - 5;
  const levelGap = Math.abs(homeBase - awayBase) >= 7;

  // Modifiers (Tome 2 section 7).
  const homeAdv = 1.03; // +3% domicile
  const homeForm = 1 + 0.05 * clamp(home.form, -1, 1);
  const awayForm = 1 + 0.05 * clamp(away.form, -1, 1);
  const homeRand = rng.float(0.85, 1.15); // +/-15% aleatoire
  const awayRand = rng.float(0.85, 1.15);

  // Armed legends grant the +10% team bonus when present.
  const homeTriggers = matchLevelTriggers(
    away.name,
    isBigMatch,
    isLate,
    levelGap && homeBase < awayBase ? false : levelGap,
    Boolean(rivalry)
  );
  const awayTriggers = matchLevelTriggers(
    home.name,
    isBigMatch,
    isLate,
    levelGap,
    Boolean(rivalry)
  );
  const homeArmed = armedLegends(home.lineup, homeTriggers, rng);
  const awayArmed = armedLegends(away.lineup, awayTriggers, rng);
  const homeLegendBoost = homeArmed.length > 0 ? 1.1 : 1;
  const awayLegendBoost = awayArmed.length > 0 ? 1.1 : 1;

  // Faits divers en match : cartons, bagarre, envahissement (Tome 3 :
  // "Cartons +30%" dans les rivalites). Un rouge affaiblit l'equipe.
  const incidents = rollMatchIncidents(home, away, rng, Boolean(rivalry));
  const homeRedMalus = incidents.homeReds > 0 ? 0.9 ** incidents.homeReds : 1;
  const awayRedMalus = incidents.awayReds > 0 ? 0.9 ** incidents.awayReds : 1;

  const homeStrength =
    homeBase * homeAdv * homeForm * homeRand * homeLegendBoost * homeRedMalus;
  const awayStrength =
    awayBase * awayForm * awayRand * awayLegendBoost * awayRedMalus;

  // Expected goals from attack vs opponent defense.
  const homeLines = lineStrengths(home.lineup);
  const awayLines = lineStrengths(away.lineup);
  const homeAttack = homeLines.ATK * 0.6 + homeLines.MID * 0.4;
  const awayAttack = awayLines.ATK * 0.6 + awayLines.MID * 0.4;
  const homeDefense = homeLines.DEF * 0.65 + homeLines.GK * 0.35;
  const awayDefense = awayLines.DEF * 0.65 + awayLines.GK * 0.35;

  const intensity = rivalry ? rivalry.intensity : 1;
  let homeXg = xg(homeAttack, awayDefense, homeStrength, awayStrength) * intensity;
  let awayXg = xg(awayAttack, homeDefense, awayStrength, homeStrength) * intensity;
  homeXg = clamp(homeXg, 0.2, 3.6);
  awayXg = clamp(awayXg, 0.2, 3.4);

  const homeGoalsCount = poisson(rng, homeXg);
  const awayGoalsCount = poisson(rng, awayXg);

  const events: MatchEvent[] = [];
  buildGoals(events, home, homeGoalsCount, homeArmed, rng);
  buildGoals(events, away, awayGoalsCount, awayArmed, rng);
  events.push(...incidents.events);
  events.sort((a, b) => a.minute - b.minute);

  addNarrativeEvents(events, {
    home,
    away,
    homeGoalsCount,
    awayGoalsCount,
    homeBase,
    awayBase,
    rivalry,
  });

  // Form drift (Tome 2 section 7).
  const homeForm2 = nextForm(home.form, homeGoalsCount, awayGoalsCount);
  const awayForm2 = nextForm(away.form, awayGoalsCount, homeGoalsCount);

  return {
    homeScore: homeGoalsCount,
    awayScore: awayGoalsCount,
    events,
    homeFormAfter: homeForm2,
    awayFormAfter: awayForm2,
    rivalry,
  };
}

function xg(
  attack: number,
  defense: number,
  strength: number,
  oppStrength: number
): number {
  const attackEdge = (attack - defense) / 16;
  const strengthEdge = (strength - oppStrength) / 22;
  return 1.15 + attackEdge + strengthEdge;
}

function buildGoals(
  events: MatchEvent[],
  club: Club,
  count: number,
  armed: ArmedLegend[],
  rng: Rng
): void {
  if (count <= 0) return;
  const xi = starters(club.lineup);
  if (xi.length === 0) return;

  const armedIds = new Map(armed.map((a) => [a.player.id, a]));

  for (let i = 0; i < count; i++) {
    const weights = xi.map(({ player, assigned }) => {
      const base = ATTACK_WEIGHT[assigned] * (player.overall / 80);
      return armedIds.has(player.id) ? base * 2.4 : base;
    });
    const scorerIdx = weightedIndex(rng, weights);
    const scorer = xi[scorerIdx].player;

    // Assist from a different attacking-minded teammate (sometimes none).
    let assist: Player | undefined;
    if (rng.bool(0.7) && xi.length > 1) {
      const aWeights = xi.map(({ player, assigned }, idx) =>
        idx === scorerIdx ? 0 : ATTACK_WEIGHT[assigned] * (player.overall / 80)
      );
      assist = xi[weightedIndex(rng, aWeights)].player;
    }

    const minute = rng.int(1, 90);
    const armedLegend = armedIds.get(scorer.id);

    if (armedLegend && rng.bool(0.65)) {
      events.push({
        minute,
        type: "legendary",
        clubId: club.id,
        playerId: scorer.id,
        assistId: assist?.id,
        description: rng.pick(armedLegend.moment.narration),
      });
    } else {
      events.push({
        minute,
        type: "goal",
        clubId: club.id,
        playerId: scorer.id,
        assistId: assist?.id,
        description: narrateGoal({
          scorer: shortName(scorer.name),
          assist: assist ? shortName(assist.name) : undefined,
          club: club.name,
          minute,
          rng,
        }),
      });
    }
  }
}

function weightedIndex(rng: Rng, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return rng.int(0, weights.length - 1);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

interface NarrativeInput {
  home: Club;
  away: Club;
  homeGoalsCount: number;
  awayGoalsCount: number;
  homeBase: number;
  awayBase: number;
  rivalry?: Rivalry;
}

function addNarrativeEvents(events: MatchEvent[], n: NarrativeInput): void {
  const { home, away, homeGoalsCount, awayGoalsCount, homeBase, awayBase } = n;

  // Le Braquage : weaker side wins.
  if (homeGoalsCount > awayGoalsCount && homeBase < awayBase - 4) {
    events.push(brave(home.id, NARRATIVE_EVENTS.heist.line));
  } else if (awayGoalsCount > homeGoalsCount && awayBase < homeBase - 4) {
    events.push(brave(away.id, NARRATIVE_EVENTS.heist.line));
  }

  // Le Mur : clean sheet against a stronger attack.
  if (awayGoalsCount === 0 && awayBase >= homeBase + 3) {
    events.push(brave(home.id, NARRATIVE_EVENTS.wall.line));
  } else if (homeGoalsCount === 0 && homeBase >= awayBase + 3) {
    events.push(brave(away.id, NARRATIVE_EVENTS.wall.line));
  }

  // Le Retour Impossible : recover from two down.
  const comeback = detectComeback(events, home.id, away.id);
  if (comeback) events.push(brave(comeback, NARRATIVE_EVENTS.comeback.line));

  // La Climatisation : late away goal.
  const lateAway = events.find(
    (e) =>
      e.clubId === away.id &&
      (e.type === "goal" || e.type === "legendary") &&
      e.minute >= 80
  );
  if (lateAway && awayGoalsCount >= homeGoalsCount) {
    events.push(brave(away.id, NARRATIVE_EVENTS.ac.line));
  }
}

function detectComeback(
  events: MatchEvent[],
  homeId: string,
  awayId: string
): string | undefined {
  const goals = events
    .filter((e) => e.type === "goal" || e.type === "legendary")
    .sort((a, b) => a.minute - b.minute);
  let h = 0;
  let a = 0;
  let homeMaxDeficit = 0;
  let awayMaxDeficit = 0;
  for (const g of goals) {
    if (g.clubId === homeId) h++;
    else if (g.clubId === awayId) a++;
    homeMaxDeficit = Math.max(homeMaxDeficit, a - h);
    awayMaxDeficit = Math.max(awayMaxDeficit, h - a);
  }
  if (homeMaxDeficit >= 2 && h >= a) return homeId;
  if (awayMaxDeficit >= 2 && a >= h) return awayId;
  return undefined;
}

function brave(clubId: string, description: string): MatchEvent {
  return { minute: 90, type: "narrative", clubId, description };
}

interface IncidentRoll {
  events: MatchEvent[];
  homeReds: number;
  awayReds: number;
}

/** Cards, brawls and pitch invasions. Frequency rises in rivalries. */
function rollMatchIncidents(
  home: Club,
  away: Club,
  rng: Rng,
  isRivalry: boolean
): IncidentRoll {
  const events: MatchEvent[] = [];
  const factor = isRivalry ? 1.3 : 1; // "Cartons +30%" (Tome 3)
  let homeReds = 0;
  let awayReds = 0;

  for (const club of [home, away]) {
    const xi = starters(club.lineup);
    if (xi.length === 0) continue;
    // Cards target defenders/midfielders more (inverse of attack weight).
    const cardWeight = xi.map(
      ({ assigned }) => 1.1 - ATTACK_WEIGHT[assigned] * 0.6
    );

    const yellows = Math.min(4, Math.round(rng.float(0, 2.2 * factor)));
    for (let i = 0; i < yellows; i++) {
      const p = xi[weightedIndex(rng, cardWeight)].player;
      events.push({
        minute: rng.int(15, 90),
        type: "card",
        card: "yellow",
        clubId: club.id,
        playerId: p.id,
        description: renderText(rng.pick(YELLOW_CARD_LINES), {
          player: shortName(p.name),
          club: club.name,
        }),
      });
    }

    if (rng.bool(0.06 * factor)) {
      const p = xi[weightedIndex(rng, cardWeight)].player;
      if (club.id === home.id) homeReds++;
      else awayReds++;
      events.push({
        minute: rng.int(25, 90),
        type: "card",
        card: "red",
        clubId: club.id,
        playerId: p.id,
        description: renderText(rng.pick(RED_CARD_LINES), {
          player: shortName(p.name),
          club: club.name,
        }),
      });
    }
  }

  if (rng.bool(0.05 * factor)) {
    events.push({
      minute: rng.int(30, 88),
      type: "incident",
      description: rng.pick(BRAWL_LINES),
    });
  }
  if (rng.bool(0.03 * factor)) {
    events.push({
      minute: rng.int(20, 85),
      type: "incident",
      description: rng.pick(INVASION_LINES),
    });
  }

  return { events, homeReds, awayReds };
}

function nextForm(form: number, scored: number, conceded: number): number {
  let delta: number;
  if (scored > conceded) delta = 0.3;
  else if (scored < conceded) delta = -0.3;
  else delta = -form * 0.2; // draw drifts toward neutral
  return clamp(form + delta, -1, 1);
}
