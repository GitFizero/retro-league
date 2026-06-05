import type { Club, Fixture, StandingRow } from "@/lib/types";

/**
 * CHAMPIONNAT (PRD Tome 1 section 12). 18 clubs maximum, matchs aller-retour.
 * Classement : points, difference de buts, buts marques, buts encaisses.
 */

export const MAX_CLUBS = 18;

/**
 * Double round-robin fixture list via the circle method. Returns fixtures for
 * all matchdays (aller then retour with home/away swapped).
 */
export function generateFixtures(clubIds: string[]): Fixture[] {
  const ids = [...clubIds];
  if (ids.length % 2 !== 0) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  const fixtures: Fixture[] = [];
  let rotation = [...ids];

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      if (home === "__BYE__" || away === "__BYE__") continue;
      // Alternate home/away by round for fairness.
      const [h, a] = round % 2 === 0 ? [home, away] : [away, home];
      fixtures.push(makeFixture(round + 1, h, a));
    }
    // rotate keeping first fixed
    rotation = [rotation[0], ...rotate(rotation.slice(1))];
  }

  // Retour : same pairings, swapped venue, on later matchdays.
  const allerCount = rounds;
  const retour = fixtures.map((f) =>
    makeFixture(
      f.matchday + allerCount,
      f.awayClubId,
      f.homeClubId
    )
  );

  return [...fixtures, ...retour];
}

function rotate<T>(arr: T[]): T[] {
  if (arr.length === 0) return arr;
  return [arr[arr.length - 1], ...arr.slice(0, -1)];
}

function makeFixture(
  matchday: number,
  homeClubId: string,
  awayClubId: string
): Fixture {
  return {
    id: `md${matchday}_${homeClubId}_${awayClubId}`,
    matchday,
    homeClubId,
    awayClubId,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    events: [],
  };
}

export function totalMatchdays(clubCount: number): number {
  const n = clubCount % 2 === 0 ? clubCount : clubCount + 1;
  return (n - 1) * 2;
}

/** Compute the standings table from played fixtures. */
export function computeStandings(
  clubs: Club[],
  fixtures: Fixture[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const club of clubs) {
    rows.set(club.id, {
      clubId: club.id,
      clubName: club.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const f of fixtures) {
    if (f.status !== "played" || f.homeScore == null || f.awayScore == null) {
      continue;
    }
    const home = rows.get(f.homeClubId);
    const away = rows.get(f.awayClubId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += f.homeScore;
    home.goalsAgainst += f.awayScore;
    away.goalsFor += f.awayScore;
    away.goalsAgainst += f.homeScore;

    if (f.homeScore > f.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (f.homeScore < f.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }

  for (const club of clubs) {
    const row = rows.get(club.id);
    if (row && club.pointsPenalty) {
      // Sanctions DNCG & co. (peuvent rendre le total negatif).
      row.points -= club.pointsPenalty;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return [...rows.values()].sort(compareStandingRows);
}

export function compareStandingRows(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) {
    return b.goalDifference - a.goalDifference;
  }
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.goalsAgainst - b.goalsAgainst;
}
