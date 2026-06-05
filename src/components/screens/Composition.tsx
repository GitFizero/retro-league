"use client";

import { useState } from "react";
import { Shell, NewLeagueButton } from "@/components/Shell";
import { useGame } from "@/lib/store";
import { getPlayer } from "@/lib/content/teams";
import { ALL_FORMATIONS, SIM_LINE_OF, positionCoefficient } from "@/lib/engine/positions";
import {
  lineStrengths,
  outOfPositionWarnings,
  teamRating,
} from "@/lib/engine/composition";
import type { Line, LineupEntry, FormationName } from "@/lib/types";

const LINE_ORDER: Line[] = ["ATK", "MID", "DEF", "GK"];
const LINE_LABEL: Record<Line, string> = {
  ATK: "Attaque",
  MID: "Milieu",
  DEF: "Defense",
  GK: "Gardien",
};

export function Composition() {
  const human = useGame((s) => s.humanClub());
  const setFormation = useGame((s) => s.setFormation);
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

  const byLine: Record<Line, LineupEntry[]> = {
    GK: [],
    DEF: [],
    MID: [],
    ATK: [],
  };
  for (const e of starters) byLine[SIM_LINE_OF[e.assignedPosition]].push(e);

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
          <select
            className="border-2 border-ink rounded-sm px-2 py-1.5 bg-paper font-display text-sm"
            value={human.formation}
            onChange={(e) => setFormation(e.target.value as FormationName)}
          >
            {ALL_FORMATIONS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <button className="retro-btn text-xs" onClick={() => autoFill()}>
            Auto
          </button>
          <NewLeagueButton />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <section className="retro-card p-5 bg-[#eef1e6]">
          <div className="space-y-5">
            {LINE_ORDER.map((line) => (
              <div key={line}>
                <div className="text-[11px] uppercase tracking-widest text-ink/50 mb-2 font-display">
                  {LINE_LABEL[line]} · {Math.round(lines[line])}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {byLine[line].length === 0 && (
                    <span className="text-xs text-ink/40 italic">—</span>
                  )}
                  {byLine[line].map((e) => {
                    const p = getPlayer(e.playerId);
                    if (!p) return null;
                    const coef = positionCoefficient(e.assignedPosition, [
                      p.position,
                      ...p.secondaryPositions,
                    ]);
                    const active = selectedStarter === e.playerId;
                    return (
                      <button
                        key={e.playerId}
                        onClick={() =>
                          setSelectedStarter(active ? null : e.playerId)
                        }
                        className={`retro-card px-2 py-1.5 text-center w-24 transition ${
                          active ? "ring-4 ring-gold" : ""
                        }`}
                      >
                        <div className="font-display font-bold text-base leading-none">
                          {p.overall}
                        </div>
                        <div className="text-[11px] truncate">{p.name}</div>
                        <div
                          className={`text-[10px] ${
                            coef < 1 ? "text-retro font-semibold" : "text-ink/50"
                          }`}
                        >
                          {e.assignedPosition}
                          {coef < 1 && ` ${Math.round(coef * 100)}%`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {selectedStarter && (
            <p className="text-xs text-retro mt-4 text-center font-semibold">
              Selectionnez un remplacant pour echanger.
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
                      disabled={!selectedStarter}
                      className="w-full flex items-center justify-between gap-2 text-sm px-2 py-1 rounded-sm border border-ink/20 hover:bg-paper-dark disabled:opacity-50"
                    >
                      <span className="truncate">{p.name}</span>
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
