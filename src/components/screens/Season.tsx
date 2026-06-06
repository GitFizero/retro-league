"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { MatchModal } from "@/components/MatchModal";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { computeStandings, totalMatchdays } from "@/lib/engine/fixtures";
import type { Fixture } from "@/lib/types";

const SPEEDS = { Lent: 600, Normal: 260, Rapide: 80 } as const;
type SpeedName = keyof typeof SPEEDS;

export function Season() {
  const league = useGame((s) => s.league);
  // Derive standings locally (memoised on the league) — selecting s.standings()
  // returns a fresh array every render, which makes useSyncExternalStore loop.
  const standings = useMemo(
    () => (league ? computeStandings(league.clubs, league.fixtures) : []),
    [league]
  );
  const playMatchday = useGame((s) => s.playMatchday);
  const simulateRest = useGame((s) => s.simulateRestOfSeason);
  const seasonNumber = useGame((s) => s.seasonNumber);
  const news = useGame((s) => s.news);
  const [tab, setTab] = useState<"standings" | "results" | "news">("standings");
  const [openFixture, setOpenFixture] = useState<Fixture | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  const [viewMd, setViewMd] = useState<number | null>(null);
  // Auto-play : enchaine les journees tout seul (defaut en mode rapide), le
  // classement se reajuste en direct. Pause/reprise a la volee.
  const [auto, setAuto] = useState(league?.simulationMode === "rapide");
  const [speed, setSpeed] = useState<SpeedName>("Normal");

  const total = league ? totalMatchdays(league.clubs.length) : 0;
  const seasonOver = league ? league.currentMatchday > total : false;

  // The auto-play loop: one matchday per tick while running.
  useEffect(() => {
    if (!auto || !league || league.status !== "season") return;
    if (league.currentMatchday > total) return;
    const id = setTimeout(() => useGame.getState().playMatchday(), SPEEDS[speed]);
    return () => clearTimeout(id);
  }, [auto, league, total, speed]);

  const playAndWatch = () => {
    const playedMd = league?.currentMatchday ?? 1;
    playMatchday();
    setViewMd(null);
    const fresh = useGame.getState().league;
    if (!fresh || fresh.status !== "season") return;
    const mine = fresh.fixtures.find(
      (f) =>
        f.matchday === playedMd &&
        f.status === "played" &&
        (f.homeClubId === HUMAN_CLUB_ID || f.awayClubId === HUMAN_CLUB_ID)
    );
    if (mine) {
      setOpenFixture(mine);
      setLiveOpen(true);
    }
  };

  if (!league) return null;
  const md = Math.min(league.currentMatchday, total);
  const shownMd = viewMd ?? md;
  const lastPlayedMd = Math.min(league.currentMatchday - 1, total);

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

  return (
    <Shell subtitle={`${league.name} — Saison ${seasonNumber}`}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="font-display text-lg">
          Journee <span className="text-retro font-bold">{md}</span> / {total}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!seasonOver && (
            <button
              className={`retro-btn text-sm ${auto ? "retro-btn-gold" : "retro-btn-primary"}`}
              onClick={() => setAuto((a) => !a)}
            >
              {auto ? "⏸ Pause" : "▶ Lancer la saison"}
            </button>
          )}
          {!seasonOver && auto && (
            <div className="flex gap-1">
              {(Object.keys(SPEEDS) as SpeedName[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-xs font-display border-2 border-ink rounded-sm ${
                    speed === s ? "bg-ink text-paper" : "bg-paper"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {!seasonOver && !auto && (
            <button
              className="retro-btn retro-btn-primary text-sm"
              onClick={playAndWatch}
            >
              Jouer la journee
            </button>
          )}
          {!seasonOver && (
            <button
              className="retro-btn text-sm"
              onClick={() => {
                setAuto(false);
                simulateRest();
                setViewMd(null);
              }}
            >
              Tout simuler
            </button>
          )}
          <NewLeagueButton />
        </div>
      </div>

      {/* Bandeau resultats de la derniere journee jouee (live). */}
      {lastPlayedMd >= 1 && (
        <div className="retro-card p-2 mb-4">
          <div className="text-[10px] uppercase tracking-wide text-ink/50 mb-1 px-1">
            Resultats — Journee {lastPlayedMd}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fixturesOf(lastPlayedMd).map((f) => {
              const homeHuman = f.homeClubId === HUMAN_CLUB_ID;
              const awayHuman = f.awayClubId === HUMAN_CLUB_ID;
              const isHuman = homeHuman || awayHuman;
              // Result from the human's perspective (W/N/D) for colouring.
              let tone = "border-ink/20";
              if (isHuman && f.homeScore != null && f.awayScore != null) {
                const my = homeHuman ? f.homeScore : f.awayScore;
                const opp = homeHuman ? f.awayScore : f.homeScore;
                tone =
                  my > opp
                    ? "border-[#2f7d4f] bg-[#2f7d4f]/15 font-semibold"
                    : my < opp
                      ? "border-retro bg-retro/10 font-semibold"
                      : "border-gold bg-gold/15 font-semibold";
              }
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setLiveOpen(false);
                    setOpenFixture(f);
                  }}
                  className={`shrink-0 px-2 py-1 rounded-sm border text-xs whitespace-nowrap hover:-translate-y-0.5 transition-transform ${tone}`}
                  title={`${clubName(f.homeClubId)} vs ${clubName(f.awayClubId)}`}
                >
                  {clubName(f.homeClubId).slice(0, 12)}{" "}
                  <span className="font-display font-bold">
                    {f.homeScore}-{f.awayScore}
                  </span>{" "}
                  {clubName(f.awayClubId).slice(0, 12)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Tab active={tab === "standings"} onClick={() => setTab("standings")}>
          Classement
        </Tab>
        <Tab active={tab === "results"} onClick={() => setTab("results")}>
          Calendrier
        </Tab>
        <Tab active={tab === "news"} onClick={() => setTab("news")}>
          Faits Divers{news.length > 0 ? ` (${news.length})` : ""}
        </Tab>
      </div>

      {tab === "news" && (
        <div className="space-y-2">
          {news.length === 0 ? (
            <p className="text-sm text-ink/55 italic">
              Rien a signaler… pour l&apos;instant. Le foot francais reserve
              toujours des surprises.
            </p>
          ) : (
            news.map((n) => (
              <div key={n.id} className="retro-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-retro text-sm">
                    {n.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-ink/50">
                    J{n.matchday} · {n.clubName}
                  </span>
                </div>
                <p className="text-sm text-ink/80 mt-1">{n.text}</p>
              </div>
            ))
          )}
        </div>
      )}

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
                  onClick={() => {
                    if (played) {
                      setLiveOpen(false);
                      setOpenFixture(f);
                    }
                  }}
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
          live={liveOpen}
          onClose={() => {
            setOpenFixture(null);
            setLiveOpen(false);
          }}
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
