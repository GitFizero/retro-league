"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getPlayer, playersOfTeam } from "@/lib/content/teams";
import { unlockedAchievements, unlockedCollections } from "@/lib/content/collections";
import {
  PERSONALITIES,
  proposeAiTrade,
  refreshAiLineup,
} from "@/lib/engine/ai";
import { autoLineup, teamRating } from "@/lib/engine/composition";
import {
  makeHumanDraw,
  teamsForDepth,
  type DraftDraw,
} from "@/lib/engine/draft";
import {
  draftPickable,
  nextDraftStep,
  slotForPlayer,
} from "@/lib/engine/formation-draft";
import { ALL_FORMATIONS } from "@/lib/engine/positions";
import {
  computeStandings,
  generateFixtures,
  totalMatchdays,
} from "@/lib/engine/fixtures";
import { Rng } from "@/lib/engine/rng";
import { simulateFixture } from "@/lib/engine/simulation";
import {
  isRealNews,
  resolveWantaway,
  rollOffPitch,
} from "@/lib/engine/events";
import type {
  Club,
  FormationName,
  HistoricalDepth,
  ClubPool,
  League,
  LineupEntry,
  NewsItem,
  Player,
  SimulationMode,
  StandingRow,
  TradeOffer,
} from "@/lib/types";

export const HUMAN_CLUB_ID = "human";

export type Difficulty = "normal" | "easy";

export interface CreateLeagueInput {
  name: string;
  clubName: string;
  clubCount: number;
  simulationMode: SimulationMode;
  historicalDepth: HistoricalDepth;
  /** "normal" = aucun reroll de draft, "easy" = 3 rerolls. */
  difficulty: Difficulty;
  /** Formation choisie avant le tirage : conditionne les postes a drafter. */
  formation: FormationName;
  /** Drafter 5 remplacants en plus du XI. */
  withSubs: boolean;
  /** Vivier de clubs propose a la roue. */
  clubPool: ClubPool;
  /** Pause mercato a la mi-saison (echanges + departs). */
  mercatoEnabled: boolean;
}

export const REROLLS: Record<Difficulty, number> = { normal: 0, easy: 3 };

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
  rerollsLeft: number;
  news: NewsItem[];

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
  /** One-click: start a fresh season with the same squads and sim it to the end. */
  replaySeason: () => void;
  reset: () => void;

  standings: () => StandingRow[];
  humanClub: () => Club | undefined;
}

let draftCounter = 0;

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newDraw(
  seed: number,
  depth: HistoricalDepth,
  owned: Set<string>,
  pool: ClubPool,
  pickable: (p: Player) => boolean
): DraftDraw {
  // Guarantee a pickable draw: re-draw for free if no shown player can be
  // selected (this is not a reroll — the player simply had no valid choice).
  let draw = makeHumanDraw(new Rng(seed + draftCounter++), depth, owned, pool);
  for (let i = 0; i < 20; i++) {
    if (draw.players.some(pickable)) break;
    draw = makeHumanDraw(new Rng(seed + draftCounter++), depth, owned, pool);
  }
  return draw;
}

/** Strongest XI of a real squad across all formations (best teamRating). */
function strongestLineup(squadIds: string[]): {
  formation: FormationName;
  lineup: ReturnType<typeof autoLineup>;
} {
  let best = { formation: "4-4-2" as FormationName, lineup: autoLineup(squadIds, "4-4-2"), rating: -1 };
  for (const f of ALL_FORMATIONS) {
    const lineup = autoLineup(squadIds, f.name);
    const rating = teamRating(lineup);
    if (rating > best.rating) best = { formation: f.name, lineup, rating };
  }
  return { formation: best.formation, lineup: best.lineup };
}

/**
 * Les adversaires IA sont de VRAIS club-saisons historiques, intacts : l'effectif
 * et la note d'epoque (ex. "Marseille 2010-11"). Le classement melange donc des
 * club-saisons reels, coherents avec leurs notes globales.
 */
function buildAiClubs(
  count: number,
  depth: HistoricalDepth,
  seed: number,
  pool: ClubPool
): Club[] {
  const rng = new Rng(seed);
  const teams = rng.shuffle(teamsForDepth(depth, pool)).slice(0, count);
  return teams.map((team, i) => {
    const squad = playersOfTeam(team.id).map((p) => p.id);
    const { formation, lineup } = strongestLineup(squad);
    const personality = PERSONALITIES[i % PERSONALITIES.length];
    return {
      id: `ai_${i}`,
      name: `${team.clubName} ${team.season}`,
      isAI: true,
      personality,
      squad,
      lineup,
      formation,
      form: 0,
    };
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
      rerollsLeft: 0,
      news: [],

      createLeague: (input) => {
        const seed = Math.floor(Math.random() * 1e9);
        const aiCount = Math.max(1, input.clubCount - 1);
        const aiClubs = buildAiClubs(
          aiCount,
          input.historicalDepth,
          seed,
          input.clubPool
        );

        const human: Club = {
          id: HUMAN_CLUB_ID,
          name: input.clubName || "Mon Club",
          isAI: false,
          squad: [],
          lineup: [],
          formation: input.formation,
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
          clubPool: input.clubPool,
          withSubs: input.withSubs,
          mercatoEnabled: input.mercatoEnabled,
          maxTradeSize: 1 + Math.floor(Math.random() * 3), // 1 à 3, selon la partie
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
          rerollsLeft: REROLLS[input.difficulty],
          news: [],
          humanDraw: newDraw(
            seed,
            input.historicalDepth,
            new Set(),
            input.clubPool,
            (p) => draftPickable(p, human, input.withSubs, new Set())
          ),
        });
      },

      pickHumanPlayer: (playerId) => {
        const { league, humanDraw, draftSeed } = get();
        if (!league || !humanDraw) return;
        const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
        if (!human) return;
        if (human.squad.includes(playerId)) return;
        const player = humanDraw.players.find((p) => p.id === playerId);
        if (!player) return;

        const step = nextDraftStep(human, league.withSubs);
        let entry: LineupEntry;
        if (step.kind === "xi") {
          // Formation-constrained: the player must fit a still-open slot.
          const slot = slotForPlayer(player, step.remaining);
          if (!slot) return; // poste deja complet — non selectionnable
          entry = { playerId, starter: true, assignedPosition: slot };
        } else if (step.kind === "bench") {
          entry = {
            playerId,
            starter: false,
            assignedPosition: player.position,
            benchOrder: step.benchIndex,
          };
        } else {
          return;
        }

        const squad = [...human.squad, playerId];
        const lineup = [...human.lineup, entry];
        const nextHuman: Club = { ...human, squad, lineup };
        const clubs = league.clubs.map((c) =>
          c.id === HUMAN_CLUB_ID ? nextHuman : c
        );

        if (nextDraftStep(nextHuman, league.withSubs).kind === "done") {
          set({
            league: { ...league, clubs, status: "composition" },
            humanDraw: null,
          });
        } else {
          const owned = new Set(squad);
          set({
            league: { ...league, clubs },
            humanDraw: newDraw(
              draftSeed,
              league.historicalDepth,
              owned,
              league.clubPool,
              (p) => draftPickable(p, nextHuman, league.withSubs, owned)
            ),
          });
        }
      },

      skipDraw: () => {
        const { league, draftSeed, rerollsLeft } = get();
        if (!league || rerollsLeft <= 0) return; // pas de reroll en mode normal
        const human = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
        if (!human) return;
        const owned = new Set(human.squad);
        set({
          rerollsLeft: rerollsLeft - 1,
          humanDraw: newDraw(
            draftSeed,
            league.historicalDepth,
            owned,
            league.clubPool,
            (p) => draftPickable(p, human, league.withSubs, owned)
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
        const { league, news } = get();
        if (!league || league.status !== "season") return;
        const played = playOneMatchday(league);
        const off = applyOffPitch(played);
        set({ league: off.league, news: [...off.news, ...news].slice(0, 50) });
        maybeOpenMercato(get, set);
      },

      simulateRestOfSeason: () => {
        let { league } = get();
        if (!league) return;
        const total = totalMatchdays(league.clubs.length);
        let guard = 0;
        let collected: NewsItem[] = get().news;
        while (league.status === "season" && guard < total + 2) {
          guard++;
          league = playOneMatchday(league);
          const off = applyOffPitch(league);
          league = off.league;
          collected = [...off.news, ...collected].slice(0, 50);
          // Honour the mercato pause even in rapide mode (when enabled).
          const half = Math.floor(total / 2);
          if (
            league.mercatoEnabled &&
            !get().mercatoDone &&
            league.currentMatchday > half
          ) {
            set({ league, news: collected });
            maybeOpenMercato(get, set);
            return;
          }
        }
        set({ league, news: collected });
      },

      resumeFromMercato: () => {
        const { league, news } = get();
        if (!league) return;
        // Wantaway players who were not traded leave (direction Fenerbahce).
        const rng = new Rng(`${league.id}-fener-${league.currentMatchday}`);
        const fresh: NewsItem[] = [];
        let clubs = league.clubs.map((c) => {
          if (!c.wantaway) return c;
          const out = resolveWantaway(c, rng, league.currentMatchday);
          if (out) {
            if (isRealNews(out.news)) fresh.push(out.news);
            return out.club;
          }
          return c;
        });
        // Recompute human lineup in case a trade/departure changed the squad.
        clubs = clubs.map((c) =>
          c.id === HUMAN_CLUB_ID
            ? { ...c, lineup: autoLineup(c.squad, c.formation) }
            : c
        );
        set({
          league: { ...league, clubs, status: "season" },
          offers: [],
          news: [...fresh, ...news].slice(0, 50),
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
        if (!target || offered.length === 0 || requested.length === 0) {
          return { accepted: false };
        }

        // Regles d'echange : on ne peut pas troquer "vers le haut". On compare la
        // somme des notes. Sup -> accepte ; egal -> 50% ; inf -> refuse.
        const ovr = (ids: string[]) =>
          ids.reduce((s, id) => s + (getPlayer(id)?.overall ?? 0), 0);
        const diff = ovr(offered) - ovr(requested);
        let accepted: boolean;
        if (diff > 0) accepted = true;
        else if (diff === 0)
          accepted = new Rng(
            `${league.id}-trade-${[...offered, ...requested].sort().join("-")}`
          ).bool(0.5);
        else accepted = false;
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
          const reset: Club = {
            ...c,
            form: 0,
            pointsPenalty: 0,
            forfeitNext: false,
            wantaway: undefined,
          };
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
          news: [],
        });
      },

      replaySeason: () => {
        const api = get();
        api.nextSeason(); // same squads, fresh calendar
        api.startSeason();
        // Blast through to the final whistle, auto-clearing the mercato pause.
        for (let guard = 0; guard < 80; guard++) {
          const st = get().league?.status;
          if (st === "season") get().simulateRestOfSeason();
          else if (st === "mercato") get().resumeFromMercato();
          else break;
        }
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
          rerollsLeft: 0,
          news: [],
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
    {
      name: "retro-league-save",
      // Bumped when the persisted shape changes. v3: AI clubs are real
      // club-seasons + mercatoEnabled option + auto-play season. Older saves are
      // incompatible: reset to a clean slate instead of rehydrating half-old.
      version: 3,
      migrate: () => ({
        league: null,
        humanDraw: null,
        draftSeed: 0,
        mercatoDone: false,
        offers: [],
        seasonNumber: 1,
        palmares: [],
        rerollsLeft: 0,
        news: [],
      }),
      // Defensive: guarantee arrays exist even if a partial state slips through.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...p,
          offers: p.offers ?? [],
          palmares: p.palmares ?? [],
          news: p.news ?? [],
          rerollsLeft: p.rerollsLeft ?? 0,
        };
      },
    }
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

    // Greve du bus : un club en forfait perd sur tapis vert (0-3).
    const homeForfeit = home.forfeitNext;
    const awayForfeit = away.forfeitNext;
    if (homeForfeit || awayForfeit) {
      home.forfeitNext = false;
      away.forfeitNext = false;
      const homeScore = homeForfeit ? 0 : 3;
      const awayScore = awayForfeit ? 0 : 3;
      const guilty = homeForfeit ? home : away;
      return {
        ...f,
        homeScore,
        awayScore,
        status: "played" as const,
        events: [
          {
            minute: 0,
            type: "narrative" as const,
            clubId: guilty.id,
            description: `Forfait de ${guilty.name} : les joueurs ne sont jamais descendus du bus. Match perdu sur tapis vert.`,
          },
        ],
      };
    }

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

/**
 * Roll the "faits divers" for the matchday that was just played. Up to two
 * incidents per matchday, applied to club copies, returning the new news.
 */
function applyOffPitch(league: League): { league: League; news: NewsItem[] } {
  const md = league.currentMatchday - 1;
  if (md < 1) return { league, news: [] };

  const rng = new Rng(`${league.id}-news-${md}`);
  const order = rng.shuffle(league.clubs.map((c) => c.id));
  const clubsById = new Map(league.clubs.map((c) => [c.id, c]));
  const fresh: NewsItem[] = [];
  let applied = 0;

  for (const id of order) {
    if (applied >= 2) break;
    const club = clubsById.get(id);
    if (!club) continue;
    const outcome = rollOffPitch(club, rng, md, 0.14);
    if (outcome) {
      clubsById.set(id, outcome.club);
      fresh.push(outcome.news);
      applied++;
    }
  }

  if (fresh.length === 0) return { league, news: [] };
  return {
    league: { ...league, clubs: [...clubsById.values()] },
    news: fresh,
  };
}

function maybeOpenMercato(
  get: () => GameState,
  set: (partial: Partial<GameState>) => void
): void {
  const { league, mercatoDone } = get();
  if (!league || mercatoDone || league.status === "finished") return;
  if (!league.mercatoEnabled) return; // mercato desactive dans les options
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
      // Recompose le XI des deux cotes apres l'echange (l'humain aussi, pour ne
      // pas garder une entree de lineup pointant vers un joueur cede).
      c.isAI ? refreshAiLineup(c) : { ...c, lineup: autoLineup(c.squad, c.formation) }
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
