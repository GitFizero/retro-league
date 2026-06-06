"use client";

import { shortName } from "@/lib/format";
import { motion } from "framer-motion";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { PlayerCard } from "@/components/PlayerCard";
import { useGame } from "@/lib/store";
import {
  BENCH_SIZE,
  draftPickable,
  draftTarget,
  nextDraftStep,
  remainingSummary,
} from "@/lib/engine/formation-draft";
import { getPlayer } from "@/lib/content/teams";

export function Draft() {
  const draw = useGame((s) => s.humanDraw);
  const pick = useGame((s) => s.pickHumanPlayer);
  const skip = useGame((s) => s.skipDraw);
  const human = useGame((s) => s.humanClub());
  const withSubs = useGame((s) => s.league?.withSubs ?? true);
  const rerollsLeft = useGame((s) => s.rerollsLeft);

  if (!draw || !human) {
    return (
      <Shell subtitle="Draft historique">
        <p>Tirage en cours…</p>
      </Shell>
    );
  }

  const squad = human.squad;
  const owned = new Set(squad);
  const formation = human.formation;
  const total = draftTarget(formation, withSubs);
  const step = nextDraftStep(human, withSubs);
  const stillNeeded =
    step.kind === "xi" ? remainingSummary(step.remaining) : [];

  return (
    <Shell subtitle="Draft historique — le hasard cree les souvenirs">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display text-lg">
          Recrue{" "}
          <span className="text-retro font-bold">{squad.length + 1}</span> /{" "}
          {total}
          <span className="ml-2 text-xs text-ink/60">({formation})</span>
        </div>
        <NewLeagueButton />
      </div>

      <div className="w-full h-2 bg-paper-dark border border-ink/40 rounded mb-3 overflow-hidden">
        <div
          className="h-full bg-retro transition-all"
          style={{ width: `${(squad.length / total) * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        {step.kind === "xi" ? (
          <>
            <span className="text-xs text-ink/60 mr-1">Postes a pourvoir :</span>
            {stillNeeded.map(({ pos, n }) => (
              <span
                key={pos}
                className="text-[11px] font-display font-bold border border-ink/40 rounded px-1.5 py-0.5 bg-paper"
              >
                {n}× {pos}
              </span>
            ))}
          </>
        ) : (
          <span className="text-xs text-gold font-display font-bold">
            🪑 Remplacant {step.kind === "bench" ? step.benchIndex + 1 : ""} /{" "}
            {BENCH_SIZE} — choisis qui tu veux
          </span>
        )}
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
              const pickable = draftPickable(p, human, withSubs, owned);
              return (
                <div
                  key={p.id}
                  className={pickable ? "" : "opacity-40 grayscale"}
                  title={
                    pickable
                      ? undefined
                      : owned.has(p.id)
                        ? "Deja dans votre effectif"
                        : "Poste deja complet pour votre formation"
                  }
                >
                  <PlayerCard
                    player={p}
                    onClick={pickable ? () => pick(p.id) : undefined}
                  />
                </div>
              );
            })}
          </div>

          {rerollsLeft > 0 ? (
            <button
              type="button"
              onClick={skip}
              className="retro-btn mt-5 text-xs"
              title="Relancer un tirage (consomme un reroll)"
            >
              ↻ Nouveau tirage ({rerollsLeft})
            </button>
          ) : (
            <p className="mt-5 text-xs text-ink/50 italic">
              Mode normal : pas de reroll. Le hasard fait la loi.
            </p>
          )}
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
                    <span className="truncate">{shortName(p.name)}</span>
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
