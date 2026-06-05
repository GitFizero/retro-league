"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPlayer } from "@/lib/content/teams";
import {
  AI_NAMES,
  PERSONALITIES,
  bestFormationFor,
  refreshAiLineup,
} from "@/lib/engine/ai";
import { autoLineup, teamRating } from "@/lib/engine/composition";
import { aiDraftSquad, makeHumanDraw, type DraftDraw } from "@/lib/engine/draft";
import {
  computeStandings,
  generateFixtures,
  totalMatchdays,
} from "@/lib/engine/fixtures";
import { Rng } from "@/lib/engine/rng";
import { simulateFixture } from "@/lib/engine/simulation";
import type { Club, Fixture, FormationName, HistoricalDepth } from "@/lib/types";

export interface MiniClub {
  id: string;
  name: string;
}

/**
 * MODE DEFI — la reponse virale facon 38-0, version Retro League.
 * Tu tires ton XI a la roue, tu lances UNE saison contre des clubs IA, et tu
 * decouvres si tu reussis la SAISON PARFAITE (invaincu). Mais surtout, le
 * resultat te RACONTE une histoire : les Moments Legendaires qui ont decide
 * ta saison. C'est ca notre difference : 38-0 donne un score, nous un souvenir.
 */

export const CHALLENGE_XI = 11;
const CHALLENGE_CLUBS = 10; // toi + 9 clubs IA
const CHALLENGE_DEPTH: HistoricalDepth = "TOUTE_HISTOIRE";
const ME = "me";

export interface ChallengeResult {
  teamName: string;
  formation: FormationName;
  rating: number;
  rank: number;
  totalClubs: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  unbeaten: boolean;
  champion: boolean;
  perfectSeason: boolean;
  score: number;
  topScorer?: { name: string; goals: number };
  legendaryHighlights: string[];
  bestWin?: string;
  /** The signature match of the season, re-livable in the match viewer. */
  highlight?: { fixture: Fixture; home: MiniClub; away: MiniClub };
}

interface ChallengeState {
  phase: "idle" | "draft" | "result";
  teamName: string;
  xi: string[];
  draw: DraftDraw | null;
  seed: number;
  result: ChallengeResult | null;

  start: (teamName: string) => void;
  pick: (playerId: string) => void;
  spin: () => void;
  undo: () => void;
  run: () => void;
  reset: () => void;
}

let drawCounter = 0;

function nextDraw(seed: number, owned: Set<string>): DraftDraw {
  return makeHumanDraw(new Rng(seed + drawCounter++), CHALLENGE_DEPTH, owned);
}

function buildAiClubs(seed: number): Club[] {
  const names = new Rng(seed).shuffle(AI_NAMES).slice(0, CHALLENGE_CLUBS - 1);
  return names.map((name, i) => {
    const personality = PERSONALITIES[i % PERSONALITIES.length];
    const squad = aiDraftSquad(
      new Rng(seed + i * 7919 + 3),
      CHALLENGE_DEPTH,
      personality
    );
    return refreshAiLineup({
      id: `ai_${i}`,
      name,
      isAI: true,
      personality,
      squad,
      lineup: [],
      formation: "4-4-2",
      form: 0,
    });
  });
}

export const useChallenge = create<ChallengeState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      teamName: "Mon XI Retro",
      xi: [],
      draw: null,
      seed: 0,
      result: null,

      start: (teamName) => {
        const seed = Math.floor(Math.random() * 1e9);
        set({
          phase: "draft",
          teamName: teamName.trim() || "Mon XI Retro",
          xi: [],
          seed,
          result: null,
          draw: nextDraw(seed, new Set()),
        });
      },

      pick: (playerId) => {
        const { xi, draw, seed } = get();
        if (!draw || xi.includes(playerId)) return;
        if (!draw.players.some((p) => p.id === playerId)) return;
        const next = [...xi, playerId];
        set({
          xi: next,
          draw:
            next.length >= CHALLENGE_XI
              ? null
              : nextDraw(seed, new Set(next)),
        });
      },

      spin: () => {
        const { xi, seed } = get();
        set({ draw: nextDraw(seed, new Set(xi)) });
      },

      undo: () => {
        const { xi, seed } = get();
        if (xi.length === 0) return;
        const next = xi.slice(0, -1);
        set({ xi: next, draw: nextDraw(seed, new Set(next)) });
      },

      run: () => {
        const { xi, teamName, seed } = get();
        if (xi.length < CHALLENGE_XI) return;
        set({ result: runChallenge(xi, teamName, seed), phase: "result" });
      },

      reset: () =>
        set({ phase: "idle", xi: [], draw: null, result: null }),
    }),
    { name: "retro-league-challenge" }
  )
);

function runChallenge(
  xi: string[],
  teamName: string,
  seed: number
): ChallengeResult {
  const formation = bestFormationFor(xi);
  const me: Club = {
    id: ME,
    name: teamName,
    isAI: false,
    squad: xi,
    lineup: autoLineup(xi, formation),
    formation,
    form: 0,
  };
  const clubs = [me, ...buildAiClubs(seed)];
  const byId = new Map(clubs.map((c) => [c.id, c]));
  let fixtures = generateFixtures(clubs.map((c) => c.id));
  const total = totalMatchdays(clubs.length);

  for (let md = 1; md <= total; md++) {
    fixtures = fixtures.map((f) => {
      if (f.matchday !== md) return f;
      const home = byId.get(f.homeClubId)!;
      const away = byId.get(f.awayClubId)!;
      const r = simulateFixture(home, away, { matchday: md, totalMatchdays: total });
      home.form = r.homeFormAfter;
      away.form = r.awayFormAfter;
      return {
        ...f,
        homeScore: r.homeScore,
        awayScore: r.awayScore,
        status: "played" as const,
        events: r.events,
      };
    });
  }

  const table = computeStandings(clubs, fixtures);
  const row = table.find((t) => t.clubId === ME)!;
  const rank = table.findIndex((t) => t.clubId === ME) + 1;
  const unbeaten = row.lost === 0;
  const champion = rank === 1;

  // Histoire : moments legendaires et plus belle victoire du joueur.
  const myFixtures = fixtures.filter(
    (f) => f.homeClubId === ME || f.awayClubId === ME
  );
  const legendaryHighlights: string[] = [];
  const scorers = new Map<string, number>();
  let bestWin: string | undefined;
  let bestMargin = 0;
  const nameOf = (id: string) => clubs.find((c) => c.id === id)?.name ?? id;

  // Pick the signature match: the one with the most legendary moments, then by
  // win margin. It becomes re-livable in the result screen.
  let highlightFixture = myFixtures[0];
  let highlightScore = -1;

  for (const f of myFixtures) {
    const meHome = f.homeClubId === ME;
    const myScore = (meHome ? f.homeScore : f.awayScore) ?? 0;
    const oppScore = (meHome ? f.awayScore : f.homeScore) ?? 0;
    if (myScore > oppScore && myScore - oppScore > bestMargin) {
      bestMargin = myScore - oppScore;
      bestWin = `${myScore}-${oppScore} contre ${nameOf(
        meHome ? f.awayClubId : f.homeClubId
      )}`;
    }
    let legends = 0;
    for (const e of f.events) {
      if (e.clubId === ME && e.type === "legendary") {
        legends++;
        if (legendaryHighlights.length < 5) legendaryHighlights.push(e.description);
      }
      if (e.clubId === ME && (e.type === "goal" || e.type === "legendary") && e.playerId) {
        scorers.set(e.playerId, (scorers.get(e.playerId) ?? 0) + 1);
      }
    }
    const margin = myScore - oppScore;
    const fixtureScore = legends * 100 + margin;
    if (fixtureScore > highlightScore) {
      highlightScore = fixtureScore;
      highlightFixture = f;
    }
  }

  const highlight = highlightFixture
    ? {
        fixture: highlightFixture,
        home: { id: highlightFixture.homeClubId, name: nameOf(highlightFixture.homeClubId) },
        away: { id: highlightFixture.awayClubId, name: nameOf(highlightFixture.awayClubId) },
      }
    : undefined;

  const top = [...scorers.entries()].sort((a, b) => b[1] - a[1])[0];
  const topScorer = top
    ? { name: getPlayer(top[0])?.name ?? "?", goals: top[1] }
    : undefined;

  const rating = Math.round(teamRating(me.lineup));
  // Score viral : points, bonus invaincu, bonus saison parfaite.
  const score =
    row.points * 10 +
    row.goalDifference +
    (unbeaten ? 200 : 0) +
    (champion ? 100 : 0);

  return {
    teamName,
    formation,
    rating,
    rank,
    totalClubs: clubs.length,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    points: row.points,
    unbeaten,
    champion,
    perfectSeason: unbeaten && champion,
    score,
    topScorer,
    legendaryHighlights,
    bestWin,
    highlight,
  };
}
