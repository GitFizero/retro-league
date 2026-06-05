import { beforeEach, describe, expect, it } from "vitest";
import { useChallenge, CHALLENGE_XI } from "@/lib/challenge";

function draftXi() {
  let guard = 0;
  while (useChallenge.getState().xi.length < CHALLENGE_XI && guard < 300) {
    guard++;
    const draw = useChallenge.getState().draw;
    if (!draw) break;
    const owned = new Set(useChallenge.getState().xi);
    const pick = draw.players.find((p) => !owned.has(p.id));
    if (pick) useChallenge.getState().pick(pick.id);
    else useChallenge.getState().spin();
  }
}

describe("Mode Defi", () => {
  beforeEach(() => useChallenge.getState().reset());

  it("drafts an XI and runs a full season producing a coherent result", () => {
    useChallenge.getState().start("Test XI");
    expect(useChallenge.getState().phase).toBe("draft");

    draftXi();
    expect(useChallenge.getState().xi.length).toBe(CHALLENGE_XI);
    expect(useChallenge.getState().draw).toBeNull();

    useChallenge.getState().run();
    const { phase, result } = useChallenge.getState();
    expect(phase).toBe("result");
    expect(result).not.toBeNull();

    const r = result!;
    // 10 clubs -> double round robin -> 18 games.
    expect(r.played).toBe(18);
    expect(r.won + r.drawn + r.lost).toBe(18);
    expect(r.rank).toBeGreaterThanOrEqual(1);
    expect(r.rank).toBeLessThanOrEqual(r.totalClubs);
    expect(r.unbeaten).toBe(r.lost === 0);
    expect(r.perfectSeason).toBe(r.unbeaten && r.champion);
    expect(r.rating).toBeGreaterThan(40);
  });

  it("never lets the same player be picked twice", () => {
    useChallenge.getState().start("Dup");
    draftXi();
    const xi = useChallenge.getState().xi;
    expect(new Set(xi).size).toBe(xi.length);
  });
});
