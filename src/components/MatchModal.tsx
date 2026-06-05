"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { findRivalry } from "@/lib/content/legendary";
import { getPlayer } from "@/lib/content/teams";
import type { Club, Fixture, MatchEvent } from "@/lib/types";

const TICK_MS = 1100;

export function MatchModal({
  fixture,
  clubs,
  onClose,
  live = false,
}: {
  fixture: Fixture;
  clubs: Club[];
  onClose: () => void;
  live?: boolean;
}) {
  const home = clubs.find((c) => c.id === fixture.homeClubId);
  const away = clubs.find((c) => c.id === fixture.awayClubId);
  const rivalry = home && away ? findRivalry(home.name, away.name) : undefined;

  // Full chronological timeline (goals, legendary moments, narrative beats).
  const timeline = useMemo(
    () => [...fixture.events].sort((a, b) => a.minute - b.minute),
    [fixture.events]
  );

  const [revealed, setRevealed] = useState(live ? 0 : timeline.length);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!live) return;
    timer.current = setInterval(() => {
      setRevealed((r) => {
        if (r >= timeline.length) {
          if (timer.current) clearInterval(timer.current);
          return r;
        }
        return r + 1;
      });
    }, TICK_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [live, timeline.length]);

  if (!home || !away) return null;

  const shown = timeline.slice(0, revealed);
  const running = runningScore(shown, home.id);
  const isRevealing = live && revealed < timeline.length;
  const currentMinute = shown.length ? shown[shown.length - 1].minute : 0;

  const skip = () => {
    if (timer.current) clearInterval(timer.current);
    setRevealed(timeline.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 grid place-items-center p-4"
      onClick={isRevealing ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="retro-card bg-paper max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {rivalry && (
          <div className="text-center mb-2">
            <span className="stamp text-xs">{rivalry.label}</span>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-ink/30 pb-4 mb-3">
          <div className="text-right font-display font-bold text-lg leading-tight">
            {home.name}
          </div>
          <div className="font-display font-black text-3xl bg-ink text-paper px-4 py-1 rounded-sm tabular-nums">
            {running.home} - {running.away}
          </div>
          <div className="text-left font-display font-bold text-lg leading-tight">
            {away.name}
          </div>
        </div>

        <div className="text-center mb-4 h-5">
          {isRevealing ? (
            <span className="font-display text-retro text-sm animate-pulse">
              ⏱ {currentMinute}&apos; — le match se joue…
            </span>
          ) : (
            <span className="font-display text-ink/50 text-xs uppercase tracking-widest">
              Coup de sifflet final
            </span>
          )}
        </div>

        {shown.length === 0 && (
          <p className="text-center text-ink/55 italic py-6">
            {live ? "Coup d'envoi…" : "Match ferme, aucun but. Le verrou a tenu."}
          </p>
        )}

        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {shown.map((e, i) => (
              <motion.li
                key={`${e.minute}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <EventRow event={e} home={home} away={away} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>

        <div className="mt-6 flex gap-2">
          {isRevealing ? (
            <button className="retro-btn w-full" onClick={skip}>
              Passer ⏩
            </button>
          ) : (
            <button className="retro-btn retro-btn-primary w-full" onClick={onClose}>
              Fermer
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function runningScore(events: MatchEvent[], homeId: string) {
  let h = 0;
  let a = 0;
  for (const e of events) {
    if (e.type !== "goal" && e.type !== "legendary") continue;
    if (e.clubId === homeId) h++;
    else a++;
  }
  return { home: h, away: a };
}

function EventRow({
  event,
  home,
  away,
}: {
  event: MatchEvent;
  home: Club;
  away: Club;
}) {
  if (event.type === "narrative") {
    return (
      <p className="text-sm italic text-ink/75 text-center border-y border-dashed border-ink/25 py-2">
        &laquo; {event.description} &raquo;
      </p>
    );
  }

  const scorer = event.playerId ? getPlayer(event.playerId) : undefined;
  const team = event.clubId === home.id ? home : away;
  const isLegend = event.type === "legendary";

  return (
    <div
      className={`flex gap-3 ${
        event.clubId === away.id ? "flex-row-reverse text-right" : ""
      }`}
    >
      <div
        className={`shrink-0 font-display font-bold w-12 grid place-items-center rounded-sm border-2 ${
          isLegend
            ? "bg-gold border-ink text-ink"
            : "bg-ink border-ink text-paper"
        }`}
      >
        {event.minute}&apos;
      </div>
      <div className="min-w-0">
        {isLegend && (
          <span className="text-[10px] uppercase tracking-widest text-gold font-bold">
            ★ Moment Legendaire
          </span>
        )}
        <div className="text-sm leading-snug">{event.description}</div>
        {scorer && (
          <div className="text-[11px] text-ink/55">
            {scorer.name} · {team.name}
          </div>
        )}
      </div>
    </div>
  );
}
