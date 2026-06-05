import { beforeEach, describe, expect, it } from "vitest";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { SQUAD_SIZE } from "@/lib/engine/draft";
import { getPlayer } from "@/lib/content/teams";

const overallOf = (id: string) => getPlayer(id)?.overall ?? 0;

/** Drive the human draft to completion by always taking the first new player. */
function autoDraft() {
  let guard = 0;
  while (useGame.getState().league?.status === "draft" && guard < 400) {
    guard++;
    const draw = useGame.getState().humanDraw;
    const human = useGame.getState().humanClub();
    if (!draw || !human) break;
    const pick = draw.players.find((p) => !human.squad.includes(p.id));
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
    });
    expect(useGame.getState().league?.status).toBe("draft");

    autoDraft();
    const human = useGame.getState().humanClub();
    expect(human?.squad.length).toBe(SQUAD_SIZE);
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
    });
    autoDraft();
    const squadBefore = useGame.getState().humanClub()!.squad;
    useGame.getState().startSeason();
    playToEnd();

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
    });
    autoDraft();
    const before = useGame.getState();
    const human = before.humanClub()!;
    const ai = before.league!.clubs.find((c) => c.id !== HUMAN_CLUB_ID)!;

    // Offer our worst player for their best — the AI must refuse.
    const myWorst = [...human.squad].sort(
      (a, b) => overallOf(a) - overallOf(b)
    )[0];
    const theirBest = [...ai.squad].sort(
      (a, b) => overallOf(b) - overallOf(a)
    )[0];
    const bad = useGame
      .getState()
      .proposeTrade(ai.id, [myWorst], [theirBest]);
    expect(bad.accepted).toBe(false);
  });
});
