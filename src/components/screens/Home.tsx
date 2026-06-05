"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { useGame } from "@/lib/store";
import type { HistoricalDepth, SimulationMode } from "@/lib/types";

const DEPTHS: { value: HistoricalDepth; label: string }[] = [
  { value: "FC26", label: "FC26 uniquement" },
  { value: "FC26_FIFA20", label: "FC26 → FIFA20" },
  { value: "FC26_FIFA15", label: "FC26 → FIFA15" },
  { value: "FC26_FIFA10", label: "FC26 → FIFA10" },
  { value: "FC26_FIFA07", label: "FC26 → FIFA07 (toute l'histoire)" },
];

export function Home() {
  const createLeague = useGame((s) => s.createLeague);
  const [name, setName] = useState("Ligue des Souvenirs");
  const [clubName, setClubName] = useState("Mon Club");
  const [clubCount, setClubCount] = useState(8);
  const [mode, setMode] = useState<SimulationMode>("rapide");
  const [depth, setDepth] = useState<HistoricalDepth>("FC26_FIFA07");

  return (
    <Shell>
      <section className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">
            Le musee interactif du football
          </h2>
          <p className="text-ink/80 leading-relaxed">
            Construisez une equipe impossible avec les joueurs de votre
            adolescence. Tirez vos recrues au sort, affrontez des clubs rivaux et
            revivez les <strong>Moments Legendaires</strong> : le coup franc de
            Juninho, Payet qui torture Lyon, l&apos;acceleration de Mbappe.
          </p>
          <ul className="text-sm text-ink/70 space-y-1">
            <li>★ Draft historique — le hasard cree les souvenirs</li>
            <li>★ Championnat simule, narration vivante</li>
            <li>★ Clubs IA, mercato d&apos;echanges, Hall of Fame</li>
          </ul>
          <p className="text-xs text-ink/50 italic">
            &laquo; Oh putain, je m&apos;en souviens. &raquo;
          </p>
        </div>

        <form
          className="retro-card p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createLeague({
              name,
              clubName,
              clubCount,
              simulationMode: mode,
              historicalDepth: depth,
            });
          }}
        >
          <h3 className="font-display text-xl font-bold border-b-2 border-ink/30 pb-2">
            Creer une ligue
          </h3>

          <Field label="Nom de la ligue">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Nom de votre club">
            <input
              className="input"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
          </Field>

          <Field label={`Nombre de clubs : ${clubCount}`}>
            <input
              type="range"
              min={2}
              max={18}
              value={clubCount}
              onChange={(e) => setClubCount(Number(e.target.value))}
              className="w-full accent-retro"
            />
            <div className="text-xs text-ink/60">
              Vous + {clubCount - 1} clubs IA
            </div>
          </Field>

          <Field label="Profondeur historique">
            <select
              className="input"
              value={depth}
              onChange={(e) => setDepth(e.target.value as HistoricalDepth)}
            >
              {DEPTHS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mode de simulation">
            <div className="flex gap-2">
              <ModeBtn
                active={mode === "rapide"}
                onClick={() => setMode("rapide")}
                title="Rapide"
                desc="Toute la saison d'un coup"
              />
              <ModeBtn
                active={mode === "validation"}
                onClick={() => setMode("validation")}
                title="Validation"
                desc="Journee par journee"
              />
            </div>
          </Field>

          <button type="submit" className="retro-btn retro-btn-primary w-full">
            Lancer le tirage
          </button>
        </form>
      </section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 2px solid rgba(34, 34, 34, 0.8);
          background: #fbf9f3;
          padding: 0.5rem 0.6rem;
          border-radius: 2px;
          font-family: var(--font-body);
        }
        :global(.input:focus) {
          outline: 2px solid #c9a64d;
        }
      `}</style>
    </Shell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink/70">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModeBtn({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border-2 border-ink rounded-sm p-2 text-left transition ${
        active ? "bg-ink text-paper" : "bg-paper hover:bg-paper-dark"
      }`}
    >
      <div className="font-display font-bold text-sm">{title}</div>
      <div className={`text-[11px] ${active ? "text-paper/80" : "text-ink/60"}`}>
        {desc}
      </div>
    </button>
  );
}
