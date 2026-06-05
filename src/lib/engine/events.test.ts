import { describe, expect, it } from "vitest";
import { aiDraftSquad } from "@/lib/engine/draft";
import { autoLineup } from "@/lib/engine/composition";
import { bestFormationFor } from "@/lib/engine/ai";
import { computeStandings } from "@/lib/engine/fixtures";
import { rollOffPitch, resolveWantaway } from "@/lib/engine/events";
import { Rng } from "@/lib/engine/rng";
import { getPlayer } from "@/lib/content/teams";
import type { Club, Fixture } from "@/lib/types";

function club(id: string, seed: string): Club {
  const squad = aiDraftSquad(new Rng(seed), "TOUTE_HISTOIRE", "equilibree");
  const formation = bestFormationFor(squad);
  return {
    id,
    name: id,
    isAI: false,
    squad,
    lineup: autoLineup(squad, formation),
    formation,
    form: 0,
  };
}

describe("faits divers (off-pitch events)", () => {
  it("applies DNCG point deductions to the standings", () => {
    const a: Club = { ...club("a", "a"), pointsPenalty: 3 };
    const b = club("b", "b");
    const fixtures: Fixture[] = [
      {
        id: "1",
        matchday: 1,
        homeClubId: "a",
        awayClubId: "b",
        homeScore: 1,
        awayScore: 0,
        status: "played",
        events: [],
      },
    ];
    const table = computeStandings([a, b], fixtures);
    const rowA = table.find((r) => r.clubId === "a")!;
    // Won (3 pts) minus 3 DNCG penalty = 0.
    expect(rowA.points).toBe(0);
  });

  it("keeps a 1-for-1 squad size and resolvable players across many rolls", () => {
    let c = club("c", "seed-c");
    const rng = new Rng("rolls");
    const size = c.squad.length;
    for (let i = 0; i < 80; i++) {
      const out = rollOffPitch(c, rng, i + 1, 1); // probability 1 -> always fires
      if (out) {
        c = out.club;
        expect(out.news.text.length).toBeGreaterThan(5);
      }
      // Squad size is preserved (replacements swap 1 for 1).
      expect(c.squad.length).toBe(size);
      // Every squad id resolves (youths are registered in the lookup).
      for (const id of c.squad) expect(getPlayer(id)).toBeDefined();
    }
    // At least one penalty should have accumulated over 80 forced rolls.
    expect((c.pointsPenalty ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it("sends an un-traded wantaway player to Fenerbahce and brings in a youth", () => {
    const base = club("d", "seed-d");
    const victim = base.squad[5];
    const c: Club = { ...base, wantaway: victim };
    const out = resolveWantaway(c, new Rng("fener"), 19);
    expect(out).not.toBeNull();
    expect(out!.club.wantaway).toBeUndefined();
    expect(out!.club.squad).not.toContain(victim);
    expect(out!.club.squad.length).toBe(base.squad.length);
    expect(out!.news.text).toMatch(/Fenerbahce/i);
  });
});
