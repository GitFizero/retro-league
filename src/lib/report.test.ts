import { describe, expect, it } from "vitest";
import { decodeReport, encodeReport, type SeasonReport } from "@/lib/report";

const sample: SeasonReport = {
  v: 1,
  leagueName: "Légüe des Sôuvenirs",
  season: 2,
  champion: "Olympique Marseille",
  humanClubName: "Mon Club",
  humanRank: 3,
  standings: [
    { rank: 1, name: "Olympique Marseille", pts: 82, w: 26, d: 4, l: 8, gd: 41, human: false },
    { rank: 3, name: "Mon Club", pts: 70, w: 21, d: 7, l: 10, gd: 18, human: true },
  ],
  topScorers: [{ name: "K. Mbappé", club: "Paris Saint Germain", goals: 31 }],
  biggestWin: "Paris Saint Germain 6-0 Ajaccio",
  humanBiggestWin: "Mon Club 4-1 Nice",
  humanBiggestDefeat: "Lyon 3-0 Mon Club",
  keyMoments: ["Coup franc de Juninho dans la lucarne", "Accélération de K. Mbappé"],
};

describe("season report (shareable link)", () => {
  it("roundtrips through the URL encoding, accents included", () => {
    const enc = encodeReport(sample);
    expect(enc).not.toMatch(/[+/=]/); // url-safe alphabet
    expect(decodeReport(enc)).toEqual(sample);
  });

  it("returns null on garbage input", () => {
    expect(decodeReport("%%%not-valid%%%")).toBeNull();
  });
});
