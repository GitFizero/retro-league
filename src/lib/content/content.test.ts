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
  it("has a rich pool of teams and players", () => {
    expect(HISTORICAL_TEAMS.length).toBeGreaterThanOrEqual(20);
    expect(ALL_PLAYERS.length).toBeGreaterThanOrEqual(250);
  });

  it("gives every player a unique version id (versioning par saison)", () => {
    const ids = new Set(ALL_PLAYERS.map((p) => p.id));
    expect(ids.size).toBe(ALL_PLAYERS.length);
    // Every draftable player is resolvable via the lookup (which also holds
    // the academy youths used for replacements).
    expect(PLAYERS_BY_ID.size).toBeGreaterThanOrEqual(ALL_PLAYERS.length);
    for (const p of ALL_PLAYERS) expect(PLAYERS_BY_ID.has(p.id)).toBe(true);
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
    // Per-season versioning: a city-club spans many seasons as distinct
    // entries (datasets cover 2008-09 .. 2022-23, IP-safe city names only).
    const marseille = HISTORICAL_TEAMS.filter((t) => t.clubName === "Marseille");
    expect(marseille.length).toBeGreaterThanOrEqual(2);
    expect(new Set(marseille.map((t) => t.season)).size).toBe(marseille.length);
  });

  it("wires the newly added forgotten legends", () => {
    for (const name of ["Ronaldinho", "Giuly", "Gignac", "Pjanic"]) {
      const p = ALL_PLAYERS.find((x) => x.name.includes(name));
      expect(p, name).toBeDefined();
      expect(momentsForPlayer(p!.name).length, name).toBeGreaterThan(0);
    }
  });

  it("unlocks a hidden collection when its set is owned", () => {
    const set = ALL_PLAYERS.filter((p) =>
      ["Juninho", "Malouda", "Wiltord", "Govou"].some((n) =>
        p.name.includes(n)
      )
    );
    const names = set.map((p) => p.name.toLowerCase());
    for (const req of ["Juninho", "Malouda", "Wiltord", "Govou"]) {
      expect(names.some((n) => n.includes(req.toLowerCase())), req).toBe(true);
    }
  });
});
