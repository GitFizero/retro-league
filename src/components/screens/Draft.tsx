"use client";

import { motion } from "framer-motion";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { PlayerCard } from "@/components/PlayerCard";
import { useGame } from "@/lib/store";
import { SQUAD_SIZE } from "@/lib/engine/draft";
import { getPlayer } from "@/lib/content/teams";

export function Draft() {
  const draw = useGame((s) => s.humanDraw);
  const pick = useGame((s) => s.pickHumanPlayer);
  const skip = useGame((s) => s.skipDraw);
  const human = useGame((s) => s.humanClub());

  const squad = human?.squad ?? [];
  const owned = new Set(squad);

  if (!draw) {
    return (
      <Shell subtitle="Draft historique">
        <p>Tirage en cours…</p>
      </Shell>
    );
  }

  return (
    <Shell subtitle="Draft historique — le hasard cree les souvenirs">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg">
          Recrue{" "}
          <span className="text-retro font-bold">{squad.length + 1}</span> /{" "}
          {SQUAD_SIZE}
        </div>
        <NewLeagueButton />
      </div>

      <div className="w-full h-2 bg-paper-dark border border-ink/40 rounded mb-6 overflow-hidden">
        <div
          className="h-full bg-retro transition-all"
          style={{ width: `${(squad.length / SQUAD_SIZE) * 100}%` }}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <motion.section
          key={draw.team.id + squad.length}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="retro-card p-5"
        >
          <div className="flex items-start justify-between gap-3 border-b-2 border-ink/30 pb-3 mb-4">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight">
                {draw.team.clubName}
              </h2>
              <div className="text-sm text-ink/70">
                {draw.team.season} · {draw.team.league} · {draw.team.coach}
              </div>
              <div className="text-xs text-ink/55 mt-1">
                {draw.team.finalPosition}
                <sup>
                  {draw.team.finalPosition === 1 ? "er" : "e"}
                </sup>{" "}
                · {draw.team.points} pts
              </div>
            </div>
            {draw.team.mythicTag && (
              <span className="stamp text-xs">{draw.team.mythicTag}</span>
            )}
          </div>

          <p className="italic text-ink/75 mb-4 text-sm">
            &laquo; {draw.team.description} &raquo;
          </p>

          <p className="font-display text-sm uppercase tracking-wide text-ink/60 mb-2">
            Choisissez UN joueur
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {draw.players.map((p) => {
              const already = owned.has(p.id);
              return (
                <PlayerCard
                  key={p.id}
                  player={p}
                  onClick={already ? undefined : () => pick(p.id)}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={skip}
            className="retro-btn mt-5 text-xs"
            title="Relancer un tirage (vous perdez ce tirage)"
          >
            ↻ Nouveau tirage
          </button>
        </motion.section>

        <aside className="retro-card p-4 h-fit lg:sticky lg:top-4">
          <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
            Votre effectif
          </h3>
          {squad.length === 0 ? (
            <p className="text-sm text-ink/55 italic">
              Aucune recrue pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {squad
                .map(getPlayer)
                .filter((p): p is NonNullable<typeof p> => Boolean(p))
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-ink/50 text-xs shrink-0">
                      {p.position} · {p.overall}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </aside>
      </div>
    </Shell>
  );
}
