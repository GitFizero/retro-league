"use client";

import { findRivalry } from "@/lib/content/legendary";
import { getPlayer } from "@/lib/content/teams";
import type { Club, Fixture } from "@/lib/types";

export function MatchModal({
  fixture,
  clubs,
  onClose,
}: {
  fixture: Fixture;
  clubs: Club[];
  onClose: () => void;
}) {
  const home = clubs.find((c) => c.id === fixture.homeClubId);
  const away = clubs.find((c) => c.id === fixture.awayClubId);
  if (!home || !away) return null;

  const rivalry = findRivalry(home.name, away.name);
  const goalAndLegend = fixture.events.filter(
    (e) => e.type === "goal" || e.type === "legendary"
  );
  const narrative = fixture.events.filter((e) => e.type === "narrative");

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="retro-card bg-paper max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {rivalry && (
          <div className="text-center mb-2">
            <span className="stamp text-xs">{rivalry.label}</span>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-ink/30 pb-4 mb-4">
          <div className="text-right font-display font-bold text-lg leading-tight">
            {home.name}
          </div>
          <div className="font-display font-black text-3xl bg-ink text-paper px-4 py-1 rounded-sm">
            {fixture.homeScore} - {fixture.awayScore}
          </div>
          <div className="text-left font-display font-bold text-lg leading-tight">
            {away.name}
          </div>
        </div>

        {rivalry && (
          <p className="italic text-center text-ink/70 text-sm mb-4">
            &laquo; {rivalry.narration} &raquo;
          </p>
        )}

        <ol className="space-y-3">
          {goalAndLegend.length === 0 && (
            <li className="text-center text-ink/55 italic">
              Match ferme, aucun but. Le verrou a tenu.
            </li>
          )}
          {goalAndLegend.map((e, i) => {
            const scorer = e.playerId ? getPlayer(e.playerId) : undefined;
            const team = e.clubId === home.id ? home : away;
            const isLegend = e.type === "legendary";
            return (
              <li
                key={i}
                className={`flex gap-3 ${
                  e.clubId === away.id ? "flex-row-reverse text-right" : ""
                }`}
              >
                <div
                  className={`shrink-0 font-display font-bold w-12 grid place-items-center rounded-sm border-2 ${
                    isLegend
                      ? "bg-gold border-ink text-ink"
                      : "bg-ink border-ink text-paper"
                  }`}
                >
                  {e.minute}&apos;
                </div>
                <div className="min-w-0">
                  {isLegend && (
                    <span className="text-[10px] uppercase tracking-widest text-gold font-bold">
                      ★ Moment Legendaire
                    </span>
                  )}
                  <div className="text-sm leading-snug">{e.description}</div>
                  {scorer && (
                    <div className="text-[11px] text-ink/55">
                      {scorer.name} · {team.name}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {narrative.length > 0 && (
          <div className="mt-5 pt-4 border-t-2 border-dashed border-ink/30 space-y-2">
            {narrative.map((e, i) => (
              <p key={i} className="text-sm italic text-ink/75">
                &laquo; {e.description} &raquo;
              </p>
            ))}
          </div>
        )}

        <button className="retro-btn w-full mt-6" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
