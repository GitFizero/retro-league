import { computeStandings } from "@/lib/engine/fixtures";
import { lineStrengths, teamRating } from "@/lib/engine/composition";
import { getPlayer } from "@/lib/content/teams";
import { shortName } from "@/lib/format";
import type { League } from "@/lib/types";

export interface HumanSeasonStats {
  rank: number;
  total: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  overall: number;
  lineRatings: { ATK: number; MID: number; DEF: number; GK: number };
  topScorer?: { name: string; goals: number };
  biggestWin?: string;
  biggestDefeat?: string;
}

/** Rich end-of-season stats focused on the human's club. */
export function humanSeasonStats(
  league: League,
  humanId: string
): HumanSeasonStats {
  const standings = computeStandings(league.clubs, league.fixtures);
  const idx = standings.findIndex((r) => r.clubId === humanId);
  const row = standings[idx];
  const human = league.clubs.find((c) => c.id === humanId);
  const nameOf = (id: string) =>
    league.clubs.find((c) => c.id === id)?.name ?? id;

  let cleanSheets = 0;
  let bigWin = { margin: -1, label: "" };
  let bigLoss = { margin: -1, label: "" };
  const goals = new Map<string, number>();

  for (const f of league.fixtures) {
    if (f.status !== "played" || f.homeScore == null || f.awayScore == null)
      continue;
    const isHome = f.homeClubId === humanId;
    const isAway = f.awayClubId === humanId;
    if (!isHome && !isAway) continue;
    const my = isHome ? f.homeScore : f.awayScore;
    const opp = isHome ? f.awayScore : f.homeScore;
    const oppName = nameOf(isHome ? f.awayClubId : f.homeClubId);
    if (opp === 0) cleanSheets++;
    if (my > opp && my - opp > bigWin.margin)
      bigWin = { margin: my - opp, label: `${my}-${opp} vs ${oppName}` };
    if (my < opp && opp - my > bigLoss.margin)
      bigLoss = { margin: opp - my, label: `${opp - 0}-${my} vs ${oppName}` };
    for (const e of f.events) {
      if (
        (e.type === "goal" || e.type === "legendary") &&
        e.clubId === humanId &&
        e.playerId
      ) {
        goals.set(e.playerId, (goals.get(e.playerId) ?? 0) + 1);
      }
    }
  }

  const top = [...goals.entries()].sort((a, b) => b[1] - a[1])[0];
  const lr = human
    ? lineStrengths(human.lineup)
    : { ATK: 0, MID: 0, DEF: 0, GK: 0 };

  return {
    rank: idx + 1,
    total: standings.length,
    points: row?.points ?? 0,
    won: row?.won ?? 0,
    drawn: row?.drawn ?? 0,
    lost: row?.lost ?? 0,
    goalsFor: row?.goalsFor ?? 0,
    goalsAgainst: row?.goalsAgainst ?? 0,
    goalDifference: row?.goalDifference ?? 0,
    cleanSheets,
    overall: human ? Math.round(teamRating(human.lineup)) : 0,
    lineRatings: {
      ATK: Math.round(lr.ATK),
      MID: Math.round(lr.MID),
      DEF: Math.round(lr.DEF),
      GK: Math.round(lr.GK),
    },
    topScorer: top
      ? { name: shortName(getPlayer(top[0])?.name ?? "?"), goals: top[1] }
      : undefined,
    biggestWin: bigWin.margin >= 0 ? bigWin.label : undefined,
    biggestDefeat: bigLoss.margin >= 0 ? bigLoss.label : undefined,
  };
}
