import { describe, expect, it } from "vitest";
import {
  ALL_PLAYERS,
  HISTORICAL_TEAMS,
  PLAYERS_BY_ID,
  playersOfTeam,
} from "@/lib/content/teams";
import { momentsForPlayer } from "@/lib/content/legendary";
import { ALL_POSITIONS } from "@/lib/types";

describe("content bible integrity", () => {
  it("has a healthy pool of teams and players", () => {
    expect(HISTORICAL_TEAMS.length).toBeGreaterThanOrEqual(10);
    expect(ALL_PLAYERS.length).toBeGreaterThanOrEqual(120);
  });

  it("gives every player a unique version id (Modele Sofifa)", () => {
    expect(PLAYERS_BY_ID.size).toBe(ALL_PLAYERS.length);
  });

  it("slugifies ids without accents or spaces", () => {
    for (const p of ALL_PLAYERS) {
      expect(p.id).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("uses only valid positions", () => {
    const valid = new Set(ALL_POSITIONS);
    for (const p of ALL_PLAYERS) {
      expect(valid.has(p.position)).toBe(true);
      for (const s of p.secondaryPositions) expect(valid.has(s)).toBe(true);
    }
  });

  it("gives every team at least 11 players to field an XI", () => {
    for (const t of HISTORICAL_TEAMS) {
      expect(playersOfTeam(t.id).length).toBeGreaterThanOrEqual(11);
    }
  });

  it("wires the iconic legends to their moments", () => {
    const juninho = ALL_PLAYERS.find((p) => p.name.includes("Juninho"));
    expect(juninho).toBeDefined();
    expect(momentsForPlayer(juninho!.name).length).toBeGreaterThan(0);

    const mbappe = ALL_PLAYERS.find((p) => p.name.includes("Mbappe"));
    expect(momentsForPlayer(mbappe!.name).length).toBeGreaterThan(0);
  });

  it("keeps two distinct versions of Mbappe-style multi-season players", () => {
    const marseille = HISTORICAL_TEAMS.filter(
      (t) => t.clubName === "Olympique de Marseille"
    );
    expect(marseille.length).toBeGreaterThanOrEqual(2);
  });
});
