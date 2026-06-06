import { describe, it, expect } from "vitest";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { draftPickable } from "@/lib/engine/formation-draft";
import { computeStandings, totalMatchdays } from "@/lib/engine/fixtures";
import type { FormationName, HistoricalDepth, SimulationMode } from "@/lib/types";

/**
 * End-to-end integrity guard: drives the whole loop (draft → season →
 * mercato → finished → nextSeason) across several configurations and asserts the
 * standings/fixtures stay consistent. Catches regressions before publishing.
 */

function autoDraft() {
  let g = 0;
  while (useGame.getState().league?.status === "draft" && g < 800) {
    g++;
    const draw = useGame.getState().humanDraw;
    const human = useGame.getState().humanClub();
    if (!draw || !human) break;
    const owned = new Set(human.squad);
    const withSubs = useGame.getState().league?.withSubs ?? false;
    const pick = draw.players.find((p) => draftPickable(p, human, withSubs, owned));
    if (pick) useGame.getState().pickHumanPlayer(pick.id);
    else useGame.getState().skipDraw();
  }
}

function playToFinish() {
  let g = 0;
  while (useGame.getState().league?.status !== "finished" && g < 80) {
    g++;
    const st = useGame.getState().league?.status;
    if (st === "season") useGame.getState().simulateRestOfSeason();
    else if (st === "mercato") useGame.getState().resumeFromMercato();
    else if (st === "composition") useGame.getState().startSeason();
    else break;
  }
}

function checkIntegrity(label: string) {
  const L = useGame.getState().league!;
  expect(L, label).toBeTruthy();
  const total = totalMatchdays(L.clubs.length);
  expect(
    L.fixtures.filter((f) => f.status === "played").length,
    `${label} all played`
  ).toBe(L.fixtures.length);
  for (const f of L.fixtures) {
    expect(
      Number.isFinite(f.homeScore!) && Number.isFinite(f.awayScore!),
      `${label} finite score`
    ).toBe(true);
    expect(f.homeScore! >= 0 && f.awayScore! >= 0, `${label} nonneg`).toBe(true);
  }
  const penalty = new Map(L.clubs.map((c) => [c.id, c.pointsPenalty || 0]));
  const table = computeStandings(L.clubs, L.fixtures);
  expect(table.length, `${label} table size`).toBe(L.clubs.length);
  for (const r of table) {
    expect(
      r.points,
      `${label} points = 3W+D-penalty`
    ).toBe(r.won * 3 + r.drawn - (penalty.get(r.clubId) || 0));
    expect(r.played, `${label} played = total`).toBe(total);
    expect(r.won + r.drawn + r.lost, `${label} W+D+L = played`).toBe(r.played);
  }
  expect(
    table.find((r) => r.clubId === HUMAN_CLUB_ID),
    `${label} human in table`
  ).toBeTruthy();
  for (const c of L.clubs) {
    expect(
      c.lineup.filter((e) => e.starter).length,
      `${label} ${c.name} fields 11`
    ).toBe(11);
  }
}

const configs: {
  cc: number;
  mode: SimulationMode;
  depth: HistoricalDepth;
  f: FormationName;
  subs: boolean;
  pool: "all" | "top10";
  merc: boolean;
}[] = [
  { cc: 18, mode: "rapide", depth: "TOUTE_HISTOIRE", f: "4-4-2", subs: false, pool: "all", merc: true },
  { cc: 8, mode: "rapide", depth: "MODERNE", f: "3-5-2", subs: true, pool: "top10", merc: false },
  { cc: 2, mode: "rapide", depth: "DEPUIS_2015", f: "4-2-3-1", subs: false, pool: "all", merc: true },
];

describe("full-loop integrity (multi-config, multi-season)", () => {
  for (const c of configs) {
    it(`cc=${c.cc} ${c.depth} ${c.f} subs=${c.subs} ${c.pool} merc=${c.merc}`, () => {
      useGame.getState().reset();
      useGame.getState().createLeague({
        name: "L",
        clubName: "Mon Club",
        clubCount: c.cc,
        simulationMode: c.mode,
        historicalDepth: c.depth,
        difficulty: "normal",
        formation: c.f,
        withSubs: c.subs,
        clubPool: c.pool,
        mercatoEnabled: c.merc,
      });
      const L0 = useGame.getState().league!;
      expect(L0.clubs.length).toBe(c.cc);
      // AI opponents are distinct real club-seasons.
      const ai = L0.clubs.filter((x) => x.isAI).map((x) => x.name);
      expect(new Set(ai).size, "distinct AI club-seasons").toBe(ai.length);

      autoDraft();
      expect(useGame.getState().league?.status, "reached composition").toBe("composition");
      useGame.getState().startSeason();
      playToFinish();
      checkIntegrity("S1");
      useGame.getState().nextSeason();
      playToFinish();
      checkIntegrity("S2");
    });
  }
});
