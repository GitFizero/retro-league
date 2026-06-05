"use client";

import { useState } from "react";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { MatchModal } from "@/components/MatchModal";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { totalMatchdays } from "@/lib/engine/fixtures";
import type { Fixture } from "@/lib/types";

export function Season() {
  const league = useGame((s) => s.league);
  const standings = useGame((s) => s.standings());
  const playMatchday = useGame((s) => s.playMatchday);
  const simulateRest = useGame((s) => s.simulateRestOfSeason);
  const [tab, setTab] = useState<"results" | "standings">("results");
  const [openFixture, setOpenFixture] = useState<Fixture | null>(null);
  const [viewMd, setViewMd] = useState<number | null>(null);

  if (!league) return null;
  const total = totalMatchdays(league.clubs.length);
  const md = Math.min(league.currentMatchday, total);
  const shownMd = viewMd ?? md;

  const clubName = (id: string) =>
    league.clubs.find((c) => c.id === id)?.name ?? id;

  const fixturesOf = (matchday: number) =>
    league.fixtures
      .filter((f) => f.matchday === matchday)
      .sort((a, b) =>
        a.homeClubId === HUMAN_CLUB_ID || a.awayClubId === HUMAN_CLUB_ID
          ? -1
          : b.homeClubId === HUMAN_CLUB_ID || b.awayClubId === HUMAN_CLUB_ID
            ? 1
            : 0
      );

  const seasonOver = league.currentMatchday > total;

  return (
    <Shell subtitle={`${league.name} — Championnat`}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="font-display text-lg">
          Journee <span className="text-retro font-bold">{md}</span> / {total}
        </div>
        <div className="flex items-center gap-2">
          {!seasonOver && (
            <button
              className="retro-btn retro-btn-primary text-sm"
              onClick={() => {
                playMatchday();
                setViewMd(null);
              }}
            >
              Jouer la journee
            </button>
          )}
          {!seasonOver && league.simulationMode === "rapide" && (
            <button
              className="retro-btn retro-btn-gold text-sm"
              onClick={() => {
                simulateRest();
                setViewMd(null);
              }}
            >
              Simuler la saison
            </button>
          )}
          <NewLeagueButton />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Tab active={tab === "results"} onClick={() => setTab("results")}>
          Calendrier
        </Tab>
        <Tab active={tab === "standings"} onClick={() => setTab("standings")}>
          Classement
        </Tab>
      </div>

      {tab === "standings" && (
        <div className="retro-card p-4 overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
                <th>J</th>
                <th>G</th>
                <th>N</th>
                <th>P</th>
                <th>BP</th>
                <th>BC</th>
                <th>Diff</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr
                  key={row.clubId}
                  className={
                    row.clubId === HUMAN_CLUB_ID
                      ? "bg-gold/20 font-semibold"
                      : ""
                  }
                >
                  <td>{i + 1}</td>
                  <td>{row.clubName}</td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>
                    {row.goalDifference > 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                  <td className="font-display font-bold text-retro">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              className="retro-btn text-xs"
              disabled={shownMd <= 1}
              onClick={() => setViewMd(Math.max(1, shownMd - 1))}
            >
              ←
            </button>
            <span className="font-display font-bold">Journee {shownMd}</span>
            <button
              className="retro-btn text-xs"
              disabled={shownMd >= total}
              onClick={() => setViewMd(Math.min(total, shownMd + 1))}
            >
              →
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {fixturesOf(shownMd).map((f) => {
              const isHuman =
                f.homeClubId === HUMAN_CLUB_ID ||
                f.awayClubId === HUMAN_CLUB_ID;
              const played = f.status === "played";
              return (
                <button
                  key={f.id}
                  disabled={!played}
                  onClick={() => played && setOpenFixture(f)}
                  className={`retro-card p-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm ${
                    isHuman ? "ring-2 ring-gold" : ""
                  } ${played ? "hover:-translate-y-0.5" : "opacity-70"}`}
                >
                  <span className="text-right truncate">
                    {clubName(f.homeClubId)}
                  </span>
                  <span className="font-display font-bold bg-ink text-paper px-2 py-0.5 rounded-sm">
                    {played ? `${f.homeScore}-${f.awayScore}` : "vs"}
                  </span>
                  <span className="text-left truncate">
                    {clubName(f.awayClubId)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openFixture && (
        <MatchModal
          fixture={openFixture}
          clubs={league.clubs}
          onClose={() => setOpenFixture(null)}
        />
      )}
    </Shell>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-display font-bold uppercase text-sm tracking-wide border-2 border-ink rounded-sm ${
        active ? "bg-ink text-paper" : "bg-paper hover:bg-paper-dark"
      }`}
    >
      {children}
    </button>
  );
}
