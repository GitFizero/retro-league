import { describe, expect, it } from "vitest";
import { slotForPlayer, remainingSlots } from "@/lib/engine/formation-draft";
import type { Player, Position } from "@/lib/types";

// Minimal player fixture — only the position fields matter for slotForPlayer.
function p(position: Position, ...secondary: Position[]): Player {
  return { position, secondaryPositions: secondary } as Player;
}

describe("draft slot eligibility — formation lines (facon 38-0)", () => {
  it("a striker never drops into a midfield slot (no cross-line)", () => {
    expect(slotForPlayer(p("BU"), ["MC"])).toBeNull();
    expect(slotForPlayer(p("BU"), ["MOC"])).toBeNull();
  });

  it("a striker fills an attacking slot", () => {
    expect(slotForPlayer(p("BU"), ["BU"])).toBe("BU");
    // a winger covers the striker slot (same ATK line)
    expect(slotForPlayer(p("AD"), ["BU"])).toBe("BU");
  });

  it("a centre-back covers full-back slots but not midfield", () => {
    expect(slotForPlayer(p("DC"), ["DD"])).toBe("DD");
    expect(slotForPlayer(p("DC"), ["DG"])).toBe("DG");
    expect(slotForPlayer(p("DC"), ["MDC"])).toBeNull();
  });

  it("a goalkeeper only fills the keeper slot (can't draft 5 GKs)", () => {
    expect(slotForPlayer(p("G"), ["DC", "MC", "BU"])).toBeNull();
    expect(slotForPlayer(p("G"), ["G"])).toBe("G");
  });

  it("honours multi-position players across their lines (ST/CAM, LB/CB)", () => {
    // ST primary (ATK) + CAM secondary (MID) -> eligible for a midfield slot
    expect(slotForPlayer(p("BU", "MOC"), ["MOC"])).toBe("MOC");
    // LB primary + CB secondary (both DEF) -> covers a centre-back slot
    expect(slotForPlayer(p("DG", "DC"), ["DC"])).toBe("DC");
  });

  it("a 4-4-2 cannot accept a third striker once both ATK slots are taken", () => {
    const remaining = remainingSlots(["BU", "BU"], "4-4-2"); // both strikers placed
    expect(slotForPlayer(p("BU"), remaining)).toBeNull();
  });
});
