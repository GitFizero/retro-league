"use client";

import { shortName } from "@/lib/format";
import { useState } from "react";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { Pitch, type PitchSlot } from "@/components/Pitch";
import { useGame } from "@/lib/store";
import { getPlayer } from "@/lib/content/teams";
import { positionCoefficient } from "@/lib/engine/positions";
import {
  lineStrengths,
  outOfPositionWarnings,
  teamRating,
} from "@/lib/engine/composition";
import type { Line } from "@/lib/types";

const LINE_ORDER: Line[] = ["ATK", "MID", "DEF", "GK"];
const LINE_LABEL: Record<Line, string> = {
  ATK: "Attaque",
  MID: "Milieu",
  DEF: "Defense",
  GK: "Gardien",
};

export function Composition() {
  const human = useGame((s) => s.humanClub());
  const autoFill = useGame((s) => s.autoFill);
  const swap = useGame((s) => s.swapStarterBench);
  const startSeason = useGame((s) => s.startSeason);
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null);

  if (!human) return null;

  const lineup = human.lineup;
  const starters = lineup.filter((e) => e.starter);
  const bench = lineup
    .filter((e) => !e.starter)
    .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));

  const rating = teamRating(lineup);
  const lines = lineStrengths(lineup);
  const warnings = outOfPositionWarnings(lineup);

  const pitchSlots: PitchSlot[] = starters.map((e) => {
    const p = getPlayer(e.playerId);
    const coef = p
      ? positionCoefficient(e.assignedPosition, [p.position, ...p.secondaryPositions])
      : 1;
    return {
      key: e.playerId,
      position: e.assignedPosition,
      player: p,
      coef,
      selected: selectedStarter === e.playerId,
      onClick: () =>
        setSelectedStarter(selectedStarter === e.playerId ? null : e.playerId),
    };
  });

  const selectedSlot = selectedStarter
    ? human.lineup.find((e) => e.playerId === selectedStarter)?.assignedPosition ??
      null
    : null;
  const benchCanPlay = (id: string) => {
    if (!selectedSlot) return false;
    const p = getPlayer(id);
    return p
      ? [p.position, ...p.secondaryPositions].includes(selectedSlot)
      : false;
  };

  const onBenchClick = (benchId: string) => {
    if (selectedStarter) {
      swap(selectedStarter, benchId);
      setSelectedStarter(null);
    }
  };

  return (
    <Shell subtitle="Composition d'equipe">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">{human.name}</h2>
          <span className="bg-ink text-paper font-display font-bold px-3 py-1 rounded-sm">
            {Math.round(rating)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="border-2 border-ink rounded-sm px-3 py-1.5 bg-paper font-display text-sm font-bold">
            {human.formation}
          </span>
          <button className="retro-btn text-xs" onClick={() => autoFill()}>
            Auto
          </button>
          <NewLeagueButton />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <section>
          <div className="max-w-sm mx-auto">
            <Pitch slots={pitchSlots} formation={human.formation} />
          </div>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {LINE_ORDER.map((line) => (
              <span
                key={line}
                className="text-[11px] font-display border border-ink/30 rounded px-2 py-0.5 bg-paper"
              >
                {LINE_LABEL[line]} <strong>{Math.round(lines[line])}</strong>
              </span>
            ))}
          </div>
          {selectedStarter && (
            <p className="text-xs text-retro mt-3 text-center font-semibold">
              Selectionnez un remplacant (banc) pour echanger.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="retro-card p-4">
            <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
              Banc
            </h3>
            <ul className="space-y-1">
              {bench.map((e) => {
                const p = getPlayer(e.playerId);
                if (!p) return null;
                return (
                  <li key={e.playerId}>
                    <button
                      onClick={() => onBenchClick(e.playerId)}
                      disabled={!selectedStarter || !benchCanPlay(e.playerId)}
                      title={
                        selectedStarter && !benchCanPlay(e.playerId)
                          ? `Ne joue pas ${selectedSlot}`
                          : undefined
                      }
                      className="w-full flex items-center justify-between gap-2 text-sm px-2 py-1 rounded-sm border border-ink/20 hover:bg-paper-dark disabled:opacity-40"
                    >
                      <span className="truncate">{shortName(p.name)}</span>
                      <span className="text-ink/50 text-xs shrink-0">
                        {p.position} · {p.overall}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {warnings.length > 0 && (
            <div className="retro-card p-4 border-retro">
              <h3 className="font-display font-bold uppercase text-xs tracking-wide text-retro mb-2">
                Joueurs hors poste
              </h3>
              <ul className="text-xs text-ink/70 space-y-0.5">
                {warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="retro-btn retro-btn-primary w-full"
            onClick={() => startSeason()}
          >
            Demarrer le championnat
          </button>
        </aside>
      </div>
    </Shell>
  );
}
