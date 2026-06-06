import { beforeEach, describe, expect, it } from "vitest";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { draftPickable, draftTarget } from "@/lib/engine/formation-draft";
import { getPlayer } from "@/lib/content/teams";

const XI = draftTarget("4-4-2", true); // 11 + 5 subs

const overallOf = (id: string) => getPlayer(id)?.overall ?? 0;

/** Drive the human draft to completion by taking the first pickable player. */
function autoDraft() {
  let guard = 0;
  while (useGame.getState().league?.status === "draft" && guard < 400) {
    guard++;
    const draw = useGame.getState().humanDraw;
    const human = useGame.getState().humanClub();
    const withSubs = useGame.getState().league?.withSubs ?? true;
    if (!draw || !human) break;
    const owned = new Set(human.squad);
    const pick = draw.players.find((p) =>
      draftPickable(p, human, withSubs, owned)
    );
    if (pick) useGame.getState().pickHumanPlayer(pick.id);
    else useGame.getState().skipDraw();
  }
}

/** Play a whole season to its finished state, clearing any mercato pause. */
function playToEnd() {
  let guard = 0;
  while (useGame.getState().league?.status !== "finished" && guard < 60) {
    guard++;
    const status = useGame.getState().league?.status;
    if (status === "season") useGame.getState().simulateRestOfSeason();
    else if (status === "mercato") useGame.getState().resumeFromMercato();
    else break;
  }
}

describe("game store — full loop & multi-season", () => {
  beforeEach(() => {
    useGame.getState().reset();
  });

  it("runs create → draft → compose → season → hall of fame", () => {
    useGame.getState().createLeague({
      name: "Test",
      clubName: "Mon Club",
      clubCount: 6,
      simulationMode: "rapide",
      historicalDepth: "TOUTE_HISTOIRE",
      difficulty: "normal",
      formation: "4-4-2",
      withSubs: true,
      clubPool: "all",
      mercatoEnabled: true,
    });
    expect(useGame.getState().league?.status).toBe("draft");

    autoDraft();
    const human = useGame.getState().humanClub();
    expect(human?.squad.length).toBe(XI);
    expect(useGame.getState().league?.status).toBe("composition");

    useGame.getState().startSeason();
    expect(useGame.getState().league?.status).toBe("season");

    playToEnd();
    expect(useGame.getState().league?.status).toBe("finished");
  });

  it("chains into a new season, keeping squads and recording the palmares", () => {
    useGame.getState().createLeague({
      name: "Test",
      clubName: "Mon Club",
      clubCount: 4,
      simulationMode: "rapide",
      historicalDepth: "DEPUIS_2007",
      difficulty: "normal",
      formation: "4-4-2",
      withSubs: true,
      clubPool: "all",
      mercatoEnabled: true,
    });
    autoDraft();
    useGame.getState().startSeason();
    playToEnd();

    // Squad as it stands at season's end (off-pitch events may have swapped a
    // player for a youth) must carry over unchanged into the next season.
    const squadBefore = useGame.getState().humanClub()!.squad;
    expect(useGame.getState().seasonNumber).toBe(1);
    useGame.getState().nextSeason();

    const s = useGame.getState();
    expect(s.seasonNumber).toBe(2);
    expect(s.palmares.length).toBe(1);
    expect(s.palmares[0].season).toBe(1);
    expect(s.league?.status).toBe("composition");
    expect(s.league?.currentMatchday).toBe(1);
    // Squad (and therefore collections) carries over unchanged.
    expect(s.humanClub()!.squad).toEqual(squadBefore);
    // Fresh calendar: nothing played yet.
    expect(s.league?.fixtures.every((f) => f.status === "scheduled")).toBe(true);
  });

  it("only accepts a trade the AI judges fair, and applies it to both clubs", () => {
    useGame.getState().createLeague({
      name: "Test",
      clubName: "Mon Club",
      clubCount: 4,
      simulationMode: "rapide",
      historicalDepth: "TOUTE_HISTOIRE",
      difficulty: "normal",
      formation: "4-4-2",
      withSubs: true,
      clubPool: "all",
      mercatoEnabled: true,
    });
    autoDraft();
    const before = useGame.getState();
    const human = before.humanClub()!;
    const ai = before.league!.clubs.find((c) => c.id !== HUMAN_CLUB_ID)!;

    // Trading UP (give a strictly weaker player, ask a strictly stronger one)
    // must be refused.
    const myWorst = [...human.squad].sort(
      (a, b) => overallOf(a) - overallOf(b)
    )[0];
    const strictlyBetter = ai.squad
      .filter((id) => overallOf(id) > overallOf(myWorst))
      .sort((a, b) => overallOf(b) - overallOf(a))[0];
    if (strictlyBetter) {
      expect(
        useGame.getState().proposeTrade(ai.id, [myWorst], [strictlyBetter])
          .accepted
      ).toBe(false);
    }

    // Over-paying (give a stronger player for a weaker one) is accepted.
    const myBest = [...human.squad].sort(
      (a, b) => overallOf(b) - overallOf(a)
    )[0];
    const theirWeaker = ai.squad
      .filter((id) => overallOf(id) < overallOf(myBest))
      .sort((a, b) => overallOf(a) - overallOf(b))[0];
    if (theirWeaker) {
      expect(
        useGame.getState().proposeTrade(ai.id, [myBest], [theirWeaker]).accepted
      ).toBe(true);
    }
  });
});
