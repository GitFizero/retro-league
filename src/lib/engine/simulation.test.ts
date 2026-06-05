import { describe, expect, it } from "vitest";
import { aiDraftSquad } from "@/lib/engine/draft";
import { autoLineup, teamRating } from "@/lib/engine/composition";
import { simulateFixture } from "@/lib/engine/simulation";
import { Rng } from "@/lib/engine/rng";
import { bestFormationFor } from "@/lib/engine/ai";
import { ALL_PLAYERS } from "@/lib/content/teams";
import type { Club } from "@/lib/types";

function clubFromSquad(id: string, squad: string[]): Club {
  const formation = bestFormationFor(squad);
  return {
    id,
    name: id,
    isAI: true,
    squad,
    lineup: autoLineup(squad, formation),
    formation,
    form: 0,
  };
}

function makeClub(id: string, seed: string): Club {
  const rng = new Rng(seed);
  const squad = aiDraftSquad(rng, "FC26_FIFA07", "equilibree");
  const formation = bestFormationFor(squad);
  return {
    id,
    name: id,
    isAI: true,
    squad,
    lineup: autoLineup(squad, formation),
    formation,
    form: 0,
  };
}

describe("simulateFixture", () => {
  it("is deterministic for a fixed seed", () => {
    const home = makeClub("home", "h1");
    const away = makeClub("away", "a1");
    const ctx = { matchday: 1, totalMatchdays: 10, seed: "fixed" };
    const r1 = simulateFixture(home, away, ctx);
    const r2 = simulateFixture(home, away, ctx);
    expect(r1.homeScore).toBe(r2.homeScore);
    expect(r1.awayScore).toBe(r2.awayScore);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it("produces realistic, mostly low scorelines", () => {
    let blowouts = 0;
    const samples = 200;
    for (let i = 0; i < samples; i++) {
      const home = makeClub("h" + i, "h" + i);
      const away = makeClub("a" + i, "a" + i);
      const r = simulateFixture(home, away, {
        matchday: 1,
        totalMatchdays: 30,
        seed: "s" + i,
      });
      expect(r.homeScore).toBeGreaterThanOrEqual(0);
      expect(r.awayScore).toBeGreaterThanOrEqual(0);
      if (r.homeScore + r.awayScore >= 8) blowouts++;
    }
    // Big blowouts should be rare (Tome 2: "mais rarement 0-5").
    expect(blowouts / samples).toBeLessThan(0.05);
  });

  it("emits a goal event for each goal scored", () => {
    const home = makeClub("home", "hh");
    const away = makeClub("away", "aa");
    const r = simulateFixture(home, away, {
      matchday: 5,
      totalMatchdays: 10,
      seed: "events",
    });
    const goalEvents = r.events.filter(
      (e) => e.type === "goal" || e.type === "legendary"
    );
    expect(goalEvents.length).toBe(r.homeScore + r.awayScore);
  });

  it("every goal event carries a narration line, never a bare stat", () => {
    const home = makeClub("home", "h9");
    const away = makeClub("away", "a9");
    const r = simulateFixture(home, away, {
      matchday: 1,
      totalMatchdays: 10,
      seed: "narr",
    });
    for (const e of r.events) {
      expect(e.description.length).toBeGreaterThan(5);
      expect(e.description).not.toMatch(/^but minute/i);
    }
  });

  it("lets a clearly stronger team win the large majority of meetings", () => {
    // Explicit strong (best 16 overalls) vs weak (worst 16) squads guarantee a
    // real rating gap, so the result must favour the strong side decisively.
    const sorted = [...ALL_PLAYERS].sort((a, b) => b.overall - a.overall);
    const strongSquad = sorted.slice(0, 16).map((p) => p.id);
    const weakSquad = sorted.slice(-16).map((p) => p.id);
    const strong = clubFromSquad("strong", strongSquad);
    const weak = clubFromSquad("weak", weakSquad);
    expect(teamRating(strong.lineup)).toBeGreaterThan(
      teamRating(weak.lineup) + 8
    );

    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 200; i++) {
      // Alternate venue to neutralise home advantage.
      const [home, away] = i % 2 === 0 ? [strong, weak] : [weak, strong];
      const r = simulateFixture(home, away, {
        matchday: 1,
        totalMatchdays: 10,
        seed: "duel" + i,
      });
      if (r.homeScore === r.awayScore) continue;
      const homeWon = r.homeScore > r.awayScore;
      const strongIsHome = home === strong;
      if (homeWon === strongIsHome) strongWins++;
      else weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 3);
  });
});
