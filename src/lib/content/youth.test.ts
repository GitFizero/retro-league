import { describe, it, expect } from "vitest";
import { pickYouth, YOUTH_PLAYERS } from "@/lib/content/youth";
import { Rng } from "@/lib/engine/rng";

describe("pickYouth", () => {
  it("never returns an already-owned youth", () => {
    const rng = new Rng(1);
    const owned = new Set<string>();
    for (let i = 0; i < YOUTH_PLAYERS.length; i++) {
      const y = pickYouth(rng, "MC", owned);
      expect(y).not.toBeNull();
      expect(owned.has(y!.id)).toBe(false);
      owned.add(y!.id);
    }
  });

  it("returns null when the whole academy is owned (no duplicates)", () => {
    const owned = new Set(YOUTH_PLAYERS.map((y) => y.id));
    expect(pickYouth(new Rng(2), "BU", owned)).toBeNull();
  });
});
