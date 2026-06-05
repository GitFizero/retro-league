import { describe, expect, it } from "vitest";
import {
  computeStandings,
  generateFixtures,
  totalMatchdays,
} from "@/lib/engine/fixtures";
import type { Club, Fixture } from "@/lib/types";

function club(id: string): Club {
  return {
    id,
    name: id,
    isAI: true,
    squad: [],
    lineup: [],
    formation: "4-4-2",
    form: 0,
  };
}

describe("generateFixtures", () => {
  it("creates a full double round-robin", () => {
    const ids = ["a", "b", "c", "d"];
    const fixtures = generateFixtures(ids);
    // n*(n-1) games for a double round robin
    expect(fixtures.length).toBe(ids.length * (ids.length - 1));
  });

  it("has every pair meet exactly twice, once home each", () => {
    const ids = ["a", "b", "c", "d"];
    const fixtures = generateFixtures(ids);
    const pairKey = (f: Fixture) => `${f.homeClubId}->${f.awayClubId}`;
    const seen = new Set(fixtures.map(pairKey));
    expect(seen.size).toBe(fixtures.length); // no duplicate ordered pairs

    for (const h of ids) {
      for (const a of ids) {
        if (h === a) continue;
        expect(seen.has(`${h}->${a}`)).toBe(true);
      }
    }
  });

  it("spreads games across the right number of matchdays", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const fixtures = generateFixtures(ids);
    const maxMd = Math.max(...fixtures.map((f) => f.matchday));
    expect(maxMd).toBe(totalMatchdays(ids.length));
  });

  it("handles an odd number of clubs (byes)", () => {
    const ids = ["a", "b", "c"];
    const fixtures = generateFixtures(ids);
    // each of 3 teams plays the other 2 twice = 6 games
    expect(fixtures.length).toBe(6);
  });
});

describe("computeStandings", () => {
  it("ranks by points then goal difference then goals for", () => {
    const clubs = [club("a"), club("b"), club("c")];
    const fixtures: Fixture[] = [
      {
        id: "1",
        matchday: 1,
        homeClubId: "a",
        awayClubId: "b",
        homeScore: 3,
        awayScore: 0,
        status: "played",
        events: [],
      },
      {
        id: "2",
        matchday: 1,
        homeClubId: "c",
        awayClubId: "a",
        homeScore: 1,
        awayScore: 1,
        status: "played",
        events: [],
      },
      {
        id: "3",
        matchday: 2,
        homeClubId: "b",
        awayClubId: "c",
        homeScore: 2,
        awayScore: 2,
        status: "played",
        events: [],
      },
    ];
    const table = computeStandings(clubs, fixtures);
    expect(table[0].clubId).toBe("a"); // 4 pts, +3 GD
    expect(table[0].points).toBe(4);
    expect(table[0].goalDifference).toBe(3);
  });

  it("ignores unplayed fixtures", () => {
    const clubs = [club("a"), club("b")];
    const fixtures: Fixture[] = [
      {
        id: "1",
        matchday: 1,
        homeClubId: "a",
        awayClubId: "b",
        homeScore: null,
        awayScore: null,
        status: "scheduled",
        events: [],
      },
    ];
    const table = computeStandings(clubs, fixtures);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});
