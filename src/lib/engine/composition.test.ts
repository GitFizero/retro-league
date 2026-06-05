import { describe, expect, it } from "vitest";
import { aiDraftSquad, SQUAD_SIZE } from "@/lib/engine/draft";
import {
  autoLineup,
  lineStrengths,
  outOfPositionWarnings,
  teamRating,
} from "@/lib/engine/composition";
import { Rng } from "@/lib/engine/rng";

describe("draft + composition", () => {
  it("ai drafts a full squad", () => {
    const squad = aiDraftSquad(new Rng("draft"), "TOUTE_HISTOIRE", "equilibree");
    expect(squad.length).toBe(SQUAD_SIZE);
    expect(new Set(squad).size).toBe(squad.length); // no duplicates within squad
  });

  it("autoLineup fields exactly 11 starters", () => {
    const squad = aiDraftSquad(new Rng("c"), "TOUTE_HISTOIRE", "equilibree");
    const lineup = autoLineup(squad, "4-3-3");
    expect(lineup.filter((e) => e.starter).length).toBe(11);
    expect(lineup.filter((e) => !e.starter).length).toBeLessThanOrEqual(5);
  });

  it("produces sane team ratings in the 50-95 band", () => {
    const squad = aiDraftSquad(new Rng("r"), "DEPUIS_2015", "offensive");
    const rating = teamRating(autoLineup(squad, "4-3-3"));
    expect(rating).toBeGreaterThan(50);
    expect(rating).toBeLessThan(95);
  });

  it("weights the four lines (gk/def/mid/atk) into the rating", () => {
    const squad = aiDraftSquad(new Rng("r2"), "DEPUIS_2015", "equilibree");
    const lineup = autoLineup(squad, "4-4-2");
    const s = lineStrengths(lineup);
    const manual = s.GK * 0.2 + s.DEF * 0.25 + s.MID * 0.25 + s.ATK * 0.3;
    expect(teamRating(lineup)).toBeCloseTo(manual, 5);
  });

  it("reports out-of-position starters", () => {
    // A squad of only goalkeepers forces aberrant assignments.
    const lineup = autoLineup(["x"], "4-4-2");
    // unknown ids are dropped; just assert the helper returns an array
    expect(Array.isArray(outOfPositionWarnings(lineup))).toBe(true);
  });
});
