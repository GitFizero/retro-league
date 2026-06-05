import { describe, expect, it } from "vitest";
import { positionCoefficient } from "@/lib/engine/positions";

describe("positionCoefficient", () => {
  it("gives 100% on the natural position", () => {
    expect(positionCoefficient("BU", ["BU"])).toBe(1);
    expect(positionCoefficient("G", ["G"])).toBe(1);
  });

  it("gives 100% on a listed secondary position", () => {
    expect(positionCoefficient("AD", ["MOC", "AD"])).toBe(1);
  });

  it("applies a small malus for a nearby position (proche)", () => {
    // DC -> MDC is one line up, same lane
    expect(positionCoefficient("MDC", ["DC"])).toBe(0.9);
    // MOC -> BU
    expect(positionCoefficient("BU", ["MOC"])).toBe(0.9);
  });

  it("applies a medium malus for a far position (eloigne)", () => {
    // opposite flanks, same line
    expect(positionCoefficient("DD", ["DG"])).toBe(0.75);
  });

  it("gives the aberrant 50% for a striker fielded as centre-back", () => {
    // "BU en DC : tres gros malus" (PRD Tome 1 section 11)
    expect(positionCoefficient("DC", ["BU"])).toBe(0.5);
  });

  it("always treats keeper/outfield swaps as aberrant", () => {
    expect(positionCoefficient("G", ["BU"])).toBe(0.5);
    expect(positionCoefficient("BU", ["G"])).toBe(0.5);
  });

  it("picks the best of a player's positions", () => {
    // natural DC (aberrant at BU) but secondary MOC (proche at BU) -> 0.9
    expect(positionCoefficient("BU", ["DC", "MOC"])).toBe(0.9);
  });
});
