import { describe, expect, it } from "vitest";
import { aiDraftSquad } from "@/lib/engine/draft";
import { autoLineup } from "@/lib/engine/composition";
import { bestFormationFor } from "@/lib/engine/ai";
import {
  computeStandings,
  generateFixtures,
  totalMatchdays,
} from "@/lib/engine/fixtures";
import { simulateFixture } from "@/lib/engine/simulation";
import { Rng } from "@/lib/engine/rng";
import type { Club } from "@/lib/types";

/**
 * End-to-end: build an 8-club league, draft every squad, simulate a full
 * double round-robin and assert the table is internally consistent. This
 * mirrors what the store drives at runtime.
 */
describe("full season integration", () => {
  function makeLeague(n: number): Club[] {
    const clubs: Club[] = [];
    for (let i = 0; i < n; i++) {
      const squad = aiDraftSquad(new Rng("club" + i), "TOUTE_HISTOIRE", "equilibree");
      const formation = bestFormationFor(squad);
      clubs.push({
        id: "c" + i,
        name: "Club " + i,
        isAI: true,
        squad,
        lineup: autoLineup(squad, formation),
        formation,
        form: 0,
      });
    }
    return clubs;
  }

  it("plays every fixture exactly once and keeps the table consistent", () => {
    const clubs = makeLeague(8);
    const clubsById = new Map(clubs.map((c) => [c.id, c]));
    let fixtures = generateFixtures(clubs.map((c) => c.id));
    const total = totalMatchdays(clubs.length);

    for (let md = 1; md <= total; md++) {
      fixtures = fixtures.map((f) => {
        if (f.matchday !== md) return f;
        const home = clubsById.get(f.homeClubId)!;
        const away = clubsById.get(f.awayClubId)!;
        const r = simulateFixture(home, away, {
          matchday: md,
          totalMatchdays: total,
        });
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

    expect(fixtures.every((f) => f.status === "played")).toBe(true);

    const table = computeStandings(clubs, fixtures);
    // Each club plays 2*(n-1) games.
    for (const row of table) {
      expect(row.played).toBe(2 * (clubs.length - 1));
      expect(row.won + row.drawn + row.lost).toBe(row.played);
    }

    // Points conservation: total points = 3*decisive + 2*draws.
    const decisive = fixtures.filter((f) => f.homeScore !== f.awayScore).length;
    const draws = fixtures.length - decisive;
    const totalPoints = table.reduce((s, r) => s + r.points, 0);
    expect(totalPoints).toBe(decisive * 3 + draws * 2);

    // Goals scored equal goals conceded across the league.
    const gf = table.reduce((s, r) => s + r.goalsFor, 0);
    const ga = table.reduce((s, r) => s + r.goalsAgainst, 0);
    expect(gf).toBe(ga);
  });

  it("never crashes on the minimum 2-club league", () => {
    const clubs = makeLeague(2);
    const fixtures = generateFixtures(clubs.map((c) => c.id));
    expect(fixtures.length).toBe(2);
    const clubsById = new Map(clubs.map((c) => [c.id, c]));
    for (const f of fixtures) {
      const r = simulateFixture(
        clubsById.get(f.homeClubId)!,
        clubsById.get(f.awayClubId)!,
        { matchday: f.matchday, totalMatchdays: 2 }
      );
      expect(r.homeScore).toBeGreaterThanOrEqual(0);
    }
  });
});
