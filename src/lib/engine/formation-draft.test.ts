import { describe, expect, it } from "vitest";
import {
  slotForPlayer,
  fittingSlots,
  remainingSlots,
} from "@/lib/engine/formation-draft";
import type { Player, Position } from "@/lib/types";

// Minimal player fixture — only the position fields matter.
function p(position: Position, ...secondary: Position[]): Player {
  return { position, secondaryPositions: secondary } as Player;
}

describe("draft slot eligibility — postes stricts", () => {
  it("un joueur ne tient QUE ses postes naturels", () => {
    // un DC ne peut pas jouer DD/DG ni au milieu
    expect(slotForPlayer(p("DC"), ["DD"])).toBeNull();
    expect(slotForPlayer(p("DC"), ["DG"])).toBeNull();
    expect(slotForPlayer(p("DC"), ["MDC"])).toBeNull();
    expect(slotForPlayer(p("DC"), ["DC"])).toBe("DC");
  });

  it("un buteur ne tient pas un poste d'ailier (sauf s'il l'a)", () => {
    expect(slotForPlayer(p("BU"), ["AD"])).toBeNull();
    expect(slotForPlayer(p("BU"), ["MC"])).toBeNull();
    expect(slotForPlayer(p("BU"), ["BU"])).toBe("BU");
    expect(slotForPlayer(p("AD"), ["BU"])).toBeNull();
  });

  it("un gardien ne tient que le poste de gardien", () => {
    expect(slotForPlayer(p("G"), ["DC", "MC", "BU"])).toBeNull();
    expect(slotForPlayer(p("G"), ["G"])).toBe("G");
  });

  it("multi-postes : eligible a chacun de ses postes listes", () => {
    // DC qui remonte aussi DD : peut couvrir DD
    expect(slotForPlayer(p("DC", "DD"), ["DD"])).toBe("DD");
    // ST/LW : peut prendre un poste d'ailier gauche
    expect(slotForPlayer(p("BU", "AG"), ["AG"])).toBe("AG");
    // ST/CAM : eligible au poste de meneur
    expect(slotForPlayer(p("BU", "MOC"), ["MOC"])).toBe("MOC");
  });

  it("fittingSlots liste tous les postes ouverts du joueur", () => {
    expect(fittingSlots(p("DC", "DD"), ["DC", "DD", "DG", "MC"])).toEqual([
      "DC",
      "DD",
    ]);
    expect(fittingSlots(p("MC"), ["DC", "DD"])).toEqual([]);
  });

  it("un 4-4-2 refuse un 3e buteur une fois les 2 postes BU pris", () => {
    const remaining = remainingSlots(["BU", "BU"], "4-4-2");
    expect(slotForPlayer(p("BU"), remaining)).toBeNull();
  });
});
