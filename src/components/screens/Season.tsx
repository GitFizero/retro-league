"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { MatchModal } from "@/components/MatchModal";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { computeStandings, totalMatchdays } from "@/lib/engine/fixtures";
import { getPlayer } from "@/lib/content/teams";
import { shortName } from "@/lib/format";
import type { Fixture, NewsItem } from "@/lib/types";

// Cadence par journee jouee (ms). Le live se savoure ; "Tout simuler" pour zapper.
const SPEEDS = { Lent: 4500, Normal: 3000, Rapide: 1200 } as const;
type SpeedName = keyof typeof SPEEDS;

/** Scorer lines for a club in a fixture, e.g. ["Benzema 12' 45'", "Govou 80'"]. */
function scorers(f: Fixture, clubId: string): string[] {
  const byName = new Map<string, number[]>();
  for (const e of f.events) {
    if ((e.type !== "goal" && e.type !== "legendary") || e.clubId !== clubId || !e.playerId)
      continue;
    const nm = shortName(getPlayer(e.playerId)?.name ?? "?");
    if (!byName.has(nm)) byName.set(nm, []);
    byName.get(nm)!.push(e.minute);
  }
  return [...byName.entries()].map(
    ([nm, mins]) => `${nm} ${mins.sort((a, b) => a - b).map((m) => `${m}'`).join(" ")}`
  );
}

export function Season() {
  const league = useGame((s) => s.league);
  const standings = useMemo(
    () => (league ? computeStandings(league.clubs, league.fixtures) : []),
    [league]
  );
  const playMatchday = useGame((s) => s.playMatchday);
  const simulateRest = useGame((s) => s.simulateRestOfSeason);
  const seasonNumber = useGame((s) => s.seasonNumber);
  const news = useGame((s) => s.news);
  const [tab, setTab] = useState<"direct" | "calendrier" | "faits">("direct");
  const [openFixture, setOpenFixture] = useState<Fixture | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  const [viewMd, setViewMd] = useState<number | null>(null);
  const [auto, setAuto] = useState(league?.simulationMode === "rapide");
  const [speed, setSpeed] = useState<SpeedName>("Normal");

  const total = league ? totalMatchdays(league.clubs.length) : 0;
  const seasonOver = league ? league.currentMatchday > total : false;

  useEffect(() => {
    if (!auto || !league || league.status !== "season") return;
    if (league.currentMatchday > total) return;
    const id = setTimeout(() => useGame.getState().playMatchday(), SPEEDS[speed]);
    return () => clearTimeout(id);
  }, [auto, league, total, speed]);

  if (!league) return null;
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

  // Live feed: the human's played matches + the (rare) faits divers, interleaved
  // by matchday, newest first — each rises into view.
  type FeedItem =
    | { kind: "match"; key: string; md: number; f: Fixture }
    | { kind: "news"; key: string; md: number; n: NewsItem };
  const feed: FeedItem[] = [
    ...league.fixtures
      .filter(
        (f) =>
          f.status === "played" &&
          (f.homeClubId === HUMAN_CLUB_ID || f.awayClubId === HUMAN_CLUB_ID)
      )
      .map((f) => ({ kind: "match" as const, key: f.id, md: f.matchday, f })),
    ...news.map((n) => ({ kind: "news" as const, key: n.id, md: n.matchday, n })),
  ].sort((a, b) => b.md - a.md);

  const resultTone = (f: Fixture) => {
    const homeHuman = f.homeClubId === HUMAN_CLUB_ID;
    const my = homeHuman ? f.homeScore! : f.awayScore!;
    const opp = homeHuman ? f.awayScore! : f.homeScore!;
    if (my > opp) return { letter: "V", color: "#2f7d4f" };
    if (my < opp) return { letter: "D", color: "#C4122F" };
    return { letter: "N", color: "#C9A64D" };
  };

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
              {auto ? "⏸ Pause" : "▶ Lancer"}
            </button>
          )}
          {!seasonOver && (
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

      <div className="flex gap-2 mb-4">
        <Tab active={tab === "direct"} onClick={() => setTab("direct")}>
          En direct
        </Tab>
        <Tab active={tab === "calendrier"} onClick={() => setTab("calendrier")}>
          Calendrier
        </Tab>
        <Tab active={tab === "faits"} onClick={() => setTab("faits")}>
          Faits Divers{news.length > 0 ? ` (${news.length})` : ""}
        </Tab>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        {/* ---- MAIN (≈80%) ---- */}
        <div className="min-w-0">
          {tab === "direct" && (
            <div className="space-y-3">
              {feed.length === 0 && (
                <p className="text-sm text-ink/55 italic">
                  Lance la saison pour voir tes resultats s&apos;afficher ici.
                </p>
              )}
              {feed.map((item) =>
                item.kind === "news" ? (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 34, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="border-l-4 border-gold bg-gold/10 rounded-sm px-4 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm">
                        📰 {item.n.title}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-ink/45">
                        J{item.n.matchday} · {item.n.clubName}
                      </span>
                    </div>
                    <p className="text-xs text-ink/75 italic mt-0.5">
                      {item.n.text}
                    </p>
                  </motion.div>
                ) : (
                  (() => {
                    const f = item.f;
                    const t = resultTone(f);
                const homeScorers = scorers(f, f.homeClubId);
                const awayScorers = scorers(f, f.awayClubId);
                return (
                  <motion.button
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 34, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    onClick={() => {
                      setLiveOpen(false);
                      setOpenFixture(f);
                    }}
                    className="retro-card w-full text-left p-4 flex items-center gap-4 hover:-translate-y-0.5"
                  >
                    <span
                      className="shrink-0 grid place-items-center w-10 h-10 rounded-sm font-display font-black text-white text-lg"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.letter}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wide text-ink/45">
                        Journee {f.matchday}
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <span className={`truncate text-right ${f.homeClubId === HUMAN_CLUB_ID ? "font-bold" : ""}`}>
                          {clubName(f.homeClubId)}
                        </span>
                        <span className="font-display font-black text-xl">
                          {f.homeScore} - {f.awayScore}
                        </span>
                        <span className={`truncate ${f.awayClubId === HUMAN_CLUB_ID ? "font-bold" : ""}`}>
                          {clubName(f.awayClubId)}
                        </span>
                      </div>
                      {(homeScorers.length > 0 || awayScorers.length > 0) && (
                        <div className="grid grid-cols-2 gap-2 mt-1 text-[10px] text-ink/55 leading-tight">
                          <span className="text-right">
                            {homeScorers.map((s, i) => (
                              <span key={i} className="block truncate">⚽ {s}</span>
                            ))}
                          </span>
                          <span className="text-left">
                            {awayScorers.map((s, i) => (
                              <span key={i} className="block truncate">⚽ {s}</span>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
                  })()
                )
              )}
            </div>
          )}

          {tab === "calendrier" && (
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
                    f.homeClubId === HUMAN_CLUB_ID || f.awayClubId === HUMAN_CLUB_ID;
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
                      <span className="text-right truncate">{clubName(f.homeClubId)}</span>
                      <span className="font-display font-bold bg-ink text-paper px-2 py-0.5 rounded-sm">
                        {played ? `${f.homeScore}-${f.awayScore}` : "vs"}
                      </span>
                      <span className="text-left truncate">{clubName(f.awayClubId)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "faits" && (
            <div className="space-y-2">
              {news.length === 0 ? (
                <p className="text-sm text-ink/55 italic">
                  Rien a signaler pour l&apos;instant.
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
        </div>

        {/* ---- STANDINGS (right, smaller, live) ---- */}
        <aside className="retro-card p-3 h-fit lg:sticky lg:top-4 overflow-x-auto">
          <h3 className="font-display font-bold uppercase text-xs tracking-wide border-b-2 border-ink/30 pb-2 mb-2">
            Classement
          </h3>
          <table className="w-full text-xs">
            <tbody>
              {standings.map((row, i) => (
                <tr
                  key={row.clubId}
                  className={
                    row.clubId === HUMAN_CLUB_ID
                      ? "bg-gold/25 font-bold"
                      : i % 2
                        ? "bg-paper-dark/40"
                        : ""
                  }
                >
                  <td className="py-1 pl-1 pr-1 text-ink/50 tabular-nums">{i + 1}</td>
                  <td className="py-1 pr-1 truncate max-w-[150px]">{row.clubName}</td>
                  <td className="py-1 pr-1 text-center text-ink/50">{row.played}</td>
                  <td className="py-1 pr-1 text-right font-display font-bold text-retro">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>

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
