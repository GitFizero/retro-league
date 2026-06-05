"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPlayer } from "@/lib/content/teams";
import { unlockedAchievements, unlockedCollections } from "@/lib/content/collections";
import {
  AI_NAMES,
  PERSONALITIES,
  bestFormationFor,
  evaluateTradeForClub,
  proposeAiTrade,
  refreshAiLineup,
} from "@/lib/engine/ai";
import { autoLineup } from "@/lib/engine/composition";
import {
  SQUAD_SIZE,
  aiDraftSquad,
  makeHumanDraw,
  type DraftDraw,
} from "@/lib/engine/draft";
import {
  computeStandings,
  generateFixtures,
  totalMatchdays,
} from "@/lib/engine/fixtures";
import { Rng } from "@/lib/engine/rng";
import { simulateFixture } from "@/lib/engine/simulation";
import type {
  Club,
  FormationName,
  HistoricalDepth,
  League,
  SimulationMode,
  StandingRow,
  TradeOffer,
} from "@/lib/types";

export const HUMAN_CLUB_ID = "human";

export interface CreateLeagueInput {
  name: string;
  clubName: string;
  clubCount: number;
  simulationMode: SimulationMode;
  historicalDepth: HistoricalDepth;
}

/** One finished season recorded for the multi-season Palmares. */
export interface PalmaresEntry {
  season: number;
  championClubId: string;
  championName: string;
  humanRank: number;
  humanChampion: boolean;
}

interface GameState {
  league: League | null;
  humanDraw: DraftDraw | null;
  draftSeed: number;
  mercatoDone: boolean;
  offers: TradeOffer[];
  seasonNumber: number;
  palmares: PalmaresEntry[];

  createLeague: (input: CreateLeagueInput) => void;
  pickHumanPlayer: (playerId: string) => void;
  skipDraw: () => void;

  setFormation: (formation: FormationName) => void;
  autoFill: () => void;
  swapStarterBench: (starterId: string, benchId: string) => void;
  startSeason: () => void;

  playMatchday: () => void;
  simulateRestOfSeason: () => void;
  resumeFromMercato: () => void;

  acceptOffer: (id: string) => void;
  rejectOffer: (id: string) => void;
  proposeTrade: (toClubId: string, offered: string[], requested: string[]) =>
    { accepted: boolean };

  nextSeason: () => void;
  reset: () => void;

  standings: () => StandingRow[];
  humanClub: () => Club | undefined;
}

let draftCounter = 0;

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newDraw(seed: number, depth: HistoricalDepth, owned: Set<string>): DraftDraw {
  return makeHumanDraw(new Rng(seed + draftCounter++), depth, owned);
}

function buildAiClubs(
  count: number,
  depth: HistoricalDepth,
  seed: number
): Club[] {
  const rng = new Rng(seed);
  const names = rng.shuffle(AI_NAMES).slice(0, count);
  return names.map((name, i) => {
    const personality = PERSONALITIES[i % PERSONALITIES.length];
    const squad = aiDraftSquad(
      new Rng(seed + i * 7919 + 1),
      depth,
      personality
    );
    const base: Club = {
      id: `ai_${i}`,
      name,
      isAI: true,
      personality,
      squad,
      lineup: [],
      formation: "4-4-2",
      form: 0,
    };
    return refreshAiLineup(base);
  });
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      league: null,
      humanDraw: null,
      draftSeed: 0,
      mercatoDone: false,
      offers: [],
      seasonNumber: 1,
      palmares: [],

      createLeague: (input) => {
        const seed = Math.floor(Math.random() * 1e9);
        const aiCount = Math.max(1, input.clubCount - 1);
        const aiClubs = buildAiClubs(aiCount, input.historicalDepth, seed);

        const human: Club = {
          id: HUMAN_CLUB_ID,
          name: input.clubName || "Mon Club",
          isAI: false,
          squad: [],
          lineup: [],
          formation: "4-4-2",
          form: 0,
        };

        const clubs = [human, ...aiClubs];
        const fixtures = generateFixtures(clubs.map((c) => c.id));

        const league: League = {
          id: randomInviteCode(),
          name: input.name || "Ma Ligue Retro",
          inviteCode: randomInviteCode(),
          simulationMode: input.simulationMode,
          historicalDepth: input.historicalDepth,
          status: "draft",
          currentMatchday: 1,
          clubs,
          fixtures,
          createdAt: Date.now(),
        };

        set({
          league,
          draftSeed: seed,
          mercatoDone: false,
          offers: [],
          seasonNumber: 1,
          palmares: [],
          humanDraw: newDraw(seed, input.historicalDepth, new Set()),
        });
      },

      pickHumanPlayer: (playerId) => {
        const { league, humanDraw, draftSeed } = get();
        if (!league || !humanDraw) return;
        const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
        if (!human) return;
        if (human.squad.includes(playerId)) return;
        if (!humanDraw.players.some((p) => p.id === playerId)) return;

        const squad = [...human.squad, playerId];
        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID ? { ...c, squad } : c
        );

        if (squad.length >= SQUAD_SIZE) {
          const formation = bestFormationFor(squad);
          const finalClubs = clubs.map((c) =>
            c.id === HUMAN_CLUB_ID
              ? { ...c, formation, lineup: autoLineup(squad, formation) }
              : c
          );
          set({
            league: { ...league, clubs: finalClubs, status: "composition" },
            humanDraw: null,
          });
        } else {
          set({
            league: { ...league, clubs },
            humanDraw: newDraw(
              draftSeed,
              league.historicalDepth,
              new Set(squad)
            ),
          });
        }
      },

      skipDraw: () => {
        const { league, draftSeed } = get();
        if (!league) return;
        const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
        set({
          humanDraw: newDraw(
            draftSeed,
            league.historicalDepth,
            new Set(human?.squad ?? [])
          ),
        });
      },

      setFormation: (formation) => {
        const { league } = get();
        if (!league) return;
        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID
            ? { ...c, formation, lineup: autoLineup(c.squad, formation) }
            : c
        );
        set({ league: { ...league, clubs } });
      },

      autoFill: () => {
        const { league } = get();
        if (!league) return;
        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID
            ? { ...c, lineup: autoLineup(c.squad, c.formation) }
            : c
        );
        set({ league: { ...league, clubs } });
      },

      swapStarterBench: (starterId, benchId) => {
        const { league } = get();
        if (!league) return;
        const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
        if (!human) return;

        const starter = human.lineup.find((e) => e.playerId === starterId);
        const bench = human.lineup.find((e) => e.playerId === benchId);
        if (!starter || !bench) return;

        const lineup = human.lineup.map((e) => {
          if (e.playerId === starterId) {
            return {
              ...e,
              starter: false,
              benchOrder: bench.benchOrder ?? 0,
              assignedPosition: getPlayer(starterId)?.position ?? e.assignedPosition,
            };
          }
          if (e.playerId === benchId) {
            return {
              ...e,
              starter: true,
              benchOrder: undefined,
              assignedPosition: starter.assignedPosition,
            };
          }
          return e;
        });

        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID ? { ...c, lineup } : c
        );
        set({ league: { ...league, clubs } });
      },

      startSeason: () => {
        const { league } = get();
        if (!league) return;
        set({ league: { ...league, status: "season" } });
      },

      playMatchday: () => {
        const { league } = get();
        if (!league || league.status !== "season") return;
        set({ league: playOneMatchday(league) });
        maybeOpenMercato(get, set);
      },

      simulateRestOfSeason: () => {
        let { league } = get();
        if (!league) return;
        const total = totalMatchdays(league.clubs.length);
        let guard = 0;
        while (league.status === "season" && guard < total + 2) {
          guard++;
          league = playOneMatchday(league);
          // Honour the mercato pause even in rapide mode.
          const half = Math.floor(total / 2);
          if (!get().mercatoDone && league.currentMatchday > half) {
            set({ league });
            maybeOpenMercato(get, set);
            return;
          }
        }
        set({ league });
      },

      resumeFromMercato: () => {
        const { league } = get();
        if (!league) return;
        // Recompute human lineup in case a trade changed the squad.
        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID
            ? { ...c, lineup: autoLineup(c.squad, c.formation) }
            : c
        );
        set({
          league: { ...league, clubs, status: "season" },
          offers: [],
        });
      },

      acceptOffer: (id) => {
        const { league, offers } = get();
        if (!league) return;
        const offer = offers.find((o) => o.id === id);
        if (!offer) return;
        const clubs = applyTrade(league.clubs, offer);
        set({
          league: { ...league, clubs },
          offers: offers.map((o) =>
            o.id === id ? { ...o, status: "accepted" } : o
          ),
        });
      },

      rejectOffer: (id) => {
        const { offers } = get();
        set({
          offers: offers.map((o) =>
            o.id === id ? { ...o, status: "rejected" } : o
          ),
        });
      },

      proposeTrade: (toClubId, offered, requested) => {
        const { league } = get();
        if (!league) return { accepted: false };
        const target = league.clubs.find((c) => c.id === toClubId);
        if (!target) return { accepted: false };

        const accepted = evaluateTradeForClub(target, requested, offered);
        if (!accepted) return { accepted: false };

        const offer: TradeOffer = {
          id: `trade_${Date.now()}`,
          fromClubId: HUMAN_CLUB_ID,
          toClubId,
          offered,
          requested,
          status: "accepted",
        };
        const clubs = applyTrade(league.clubs, offer);
        set({ league: { ...league, clubs } });
        return { accepted: true };
      },

      nextSeason: () => {
        const { league, seasonNumber, palmares } = get();
        if (!league || league.status !== "finished") return;

        // Record this season into the rolling Palmares (Tome 1 section 18).
        const table = computeStandings(league.clubs, league.fixtures);
        const champion = table[0];
        const humanRank =
          table.findIndex((r) => r.clubId === HUMAN_CLUB_ID) + 1;
        const entry: PalmaresEntry = {
          season: seasonNumber,
          championClubId: champion?.clubId ?? "",
          championName: champion?.clubName ?? "",
          humanRank,
          humanChampion: champion?.clubId === HUMAN_CLUB_ID,
        };

        // Keep squads & collections; reset the competition (new calendar,
        // fresh form). Human re-composes, the loop returns to Composition.
        const clubs = league.clubs.map((c) => {
          const reset = { ...c, form: 0 };
          return c.isAI
            ? refreshAiLineup(reset)
            : { ...reset, lineup: autoLineup(c.squad, c.formation) };
        });
        const fixtures = generateFixtures(clubs.map((c) => c.id));

        set({
          league: {
            ...league,
            clubs,
            fixtures,
            currentMatchday: 1,
            status: "composition",
          },
          seasonNumber: seasonNumber + 1,
          palmares: [...palmares, entry],
          mercatoDone: false,
          offers: [],
        });
      },

      reset: () =>
        set({
          league: null,
          humanDraw: null,
          draftSeed: 0,
          mercatoDone: false,
          offers: [],
          seasonNumber: 1,
          palmares: [],
        }),

      standings: () => {
        const { league } = get();
        if (!league) return [];
        return computeStandings(league.clubs, league.fixtures);
      },

      humanClub: () => {
        const { league } = get();
        return league?.clubs.find((c) => c.id === HUMAN_CLUB_ID);
      },
    }),
    { name: "retro-league-save" }
  )
);

function playOneMatchday(league: League): League {
  const md = league.currentMatchday;
  const total = totalMatchdays(league.clubs.length);
  const clubsById = new Map(league.clubs.map((c) => [c.id, { ...c }]));

  const fixtures = league.fixtures.map((f) => {
    if (f.matchday !== md || f.status === "played") return f;
    const home = clubsById.get(f.homeClubId);
    const away = clubsById.get(f.awayClubId);
    if (!home || !away) return f;
    const result = simulateFixture(home, away, {
      matchday: md,
      totalMatchdays: total,
    });
    home.form = result.homeFormAfter;
    away.form = result.awayFormAfter;
    return {
      ...f,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      status: "played" as const,
      events: result.events,
    };
  });

  const nextMd = md + 1;
  const status = nextMd > total ? "finished" : league.status;

  return {
    ...league,
    clubs: [...clubsById.values()],
    fixtures,
    currentMatchday: nextMd,
    status,
  };
}

function maybeOpenMercato(
  get: () => GameState,
  set: (partial: Partial<GameState>) => void
): void {
  const { league, mercatoDone } = get();
  if (!league || mercatoDone || league.status === "finished") return;
  const total = totalMatchdays(league.clubs.length);
  const half = Math.floor(total / 2);
  if (league.currentMatchday <= half) return;

  // Generate up to 2 AI proposals to the human (Tome 1 section 14).
  const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
  if (!human) return;
  const rng = new Rng(league.id + "-mercato");
  const offers: TradeOffer[] = [];
  for (const ai of league.clubs.filter((c) => c.isAI).slice(0, 2)) {
    const proposal = proposeAiTrade(ai, human, rng);
    if (proposal) {
      offers.push({
        id: `offer_${ai.id}`,
        fromClubId: ai.id,
        toClubId: HUMAN_CLUB_ID,
        offered: proposal.offered,
        requested: proposal.requested,
        status: "pending",
      });
    }
  }

  set({
    league: { ...league, status: "mercato" },
    mercatoDone: true,
    offers,
  });
}

function applyTrade(clubs: Club[], offer: TradeOffer): Club[] {
  return clubs
    .map((c) => {
      if (c.id === offer.fromClubId) {
        const squad = [
          ...c.squad.filter((id) => !offer.offered.includes(id)),
          ...offer.requested,
        ];
        return { ...c, squad };
      }
      if (c.id === offer.toClubId) {
        const squad = [
          ...c.squad.filter((id) => !offer.requested.includes(id)),
          ...offer.offered,
        ];
        return { ...c, squad };
      }
      return c;
    })
    .map((c) =>
      c.isAI ? refreshAiLineup(c) : c
    );
}

/** Aggregate top scorers across all played fixtures (Hall of Fame). */
export function topScorers(league: League, limit = 10) {
  const goals = new Map<string, number>();
  for (const f of league.fixtures) {
    for (const e of f.events) {
      if (e.type === "goal" || e.type === "legendary") {
        if (e.playerId) goals.set(e.playerId, (goals.get(e.playerId) ?? 0) + 1);
      }
    }
  }
  return [...goals.entries()]
    .map(([playerId, count]) => ({ player: getPlayer(playerId), count }))
    .filter((x) => x.player)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function hallOfFameAwards(league: League, seasonsPlayed = 1) {
  const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
  const squad = (human?.squad ?? [])
    .map(getPlayer)
    .filter((p): p is NonNullable<ReturnType<typeof getPlayer>> => Boolean(p));
  return {
    collections: unlockedCollections(squad),
    achievements: unlockedAchievements(squad, seasonsPlayed),
  };
}
