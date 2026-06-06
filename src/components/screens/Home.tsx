"use client";

import { useState } from "react";
import { Shell, SupportLink } from "@/components/Shell";
import { useGame } from "@/lib/store";
import { useChallenge } from "@/lib/challenge";
import { Pitch, type PitchSlot } from "@/components/Pitch";
import { ALL_FORMATIONS, FORMATIONS } from "@/lib/engine/positions";
import type {
  FormationName,
  HistoricalDepth,
  SimulationMode,
} from "@/lib/types";

const DEPTHS: { value: HistoricalDepth; label: string }[] = [
  { value: "TOUTE_HISTOIRE", label: "Toute l'histoire (depuis 2002)" },
  { value: "DEPUIS_2007", label: "Depuis 2007" },
  { value: "DEPUIS_2010", label: "Depuis 2010" },
  { value: "DEPUIS_2015", label: "Depuis 2015" },
  { value: "MODERNE", label: "Epoque actuelle" },
];

export function Home() {
  const createLeague = useGame((s) => s.createLeague);
  const startChallenge = useChallenge((s) => s.start);
  const [name, setName] = useState("Ligue des Souvenirs");
  const [clubName, setClubName] = useState("Mon Club");
  const [mode, setMode] = useState<SimulationMode>("rapide");
  const [depth, setDepth] = useState<HistoricalDepth>("TOUTE_HISTOIRE");
  const [difficulty, setDifficulty] = useState<"normal" | "easy">("normal");
  const [formation, setFormation] = useState<FormationName>("4-4-2");
  const [withSubs, setWithSubs] = useState(false);
  const [clubPool, setClubPool] = useState<"all" | "top10">("top10");
  const [mercatoEnabled, setMercatoEnabled] = useState(true);

  // Jeu solo : un championnat complet, tous les adversaires geres par l'IA.
  const CLUB_COUNT = 18;

  return (
    <Shell>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/banner.png"
        alt="Retro League"
        className="w-full max-w-2xl mx-auto rounded-sm border-2 border-ink/30 shadow-card mb-8"
      />

      <section className="flex flex-col gap-8 max-w-2xl mx-auto">
        <div className="space-y-4 order-2">
          <h2 className="font-display text-2xl font-bold">
            Le musee interactif du football
          </h2>
          <p className="text-ink/80 leading-relaxed">
            Construisez une equipe impossible avec les joueurs de votre
            adolescence. Tirez vos recrues au sort, affrontez des clubs rivaux et
            revivez vos <strong>Moments Legendaires</strong>.
          </p>
          <ul className="text-sm text-ink/70 space-y-1">
            <li>★ Draft historique : compose ton onze parmi 300+ club-saisons</li>
            <li>★ Championnat complet simule, classement en direct</li>
            <li>★ Mercato d&apos;echanges, bilan et Hall of Fame</li>
          </ul>

          <div className="retro-card p-4 bg-ink text-paper border-gold">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gold text-lg">⚡</span>
              <h3 className="font-display font-bold text-paper">Mode Defi</h3>
              <span className="text-[10px] uppercase tracking-widest text-gold border border-gold rounded px-1.5 py-0.5">
                Rapide
              </span>
            </div>
            <p className="text-sm text-paper/80 mb-3">
              Tire ton XI a la roue et tente la{" "}
              <strong className="text-gold">saison parfaite</strong>. Peux-tu
              finir invaincu ? 2 minutes, aucun ami requis.
            </p>
            <button
              type="button"
              className="retro-btn retro-btn-gold w-full"
              onClick={() => startChallenge(clubName, difficulty)}
            >
              Relever le defi →
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-ink/50 italic">
              &laquo; Oh putain, je m&apos;en souviens. &raquo;
            </p>
            <SupportLink variant="button" />
          </div>
        </div>

        <form
          className="retro-card p-5 space-y-4 order-1"
          onSubmit={(e) => {
            e.preventDefault();
            createLeague({
              name,
              clubName,
              clubCount: CLUB_COUNT,
              simulationMode: mode,
              historicalDepth: depth,
              difficulty,
              formation,
              withSubs,
              clubPool,
              mercatoEnabled,
            });
          }}
        >
          <h3 className="font-display text-xl font-bold border-b-2 border-ink/30 pb-2">
            Creer une ligue
          </h3>

          <div className="flex items-center gap-2 text-xs bg-paper-dark border-2 border-ink/20 rounded-sm px-3 py-2">
            <span className="text-base">👥</span>
            <span className="text-ink/70">
              <strong className="font-display uppercase tracking-wide">
                Solo
              </strong>{" "}
              — 17 clubs adverses geres par l&apos;IA. Le{" "}
              <strong>multijoueur</strong> arrive
              <span className="ml-1 uppercase tracking-widest text-[10px] text-retro border border-retro rounded px-1 py-0.5">
                bientot
              </span>
            </span>
          </div>

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

          <Field label="Formation (conditionne les postes a drafter)">
            <select
              className="input"
              value={formation}
              onChange={(e) => setFormation(e.target.value as FormationName)}
            >
              {ALL_FORMATIONS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="max-w-[190px] mx-auto mt-3">
              <Pitch
                formation={formation}
                slots={FORMATIONS[formation].slots.map((pos, i) => ({
                  key: `${pos}_${i}`,
                  position: pos,
                }) as PitchSlot)}
              />
            </div>
          </Field>

          <Field label="Clubs proposes a la roue">
            <div className="flex gap-2">
              <ModeBtn
                active={clubPool === "top10"}
                onClick={() => setClubPool("top10")}
                title="Top 10"
                desc="1er au 10e de chaque saison"
              />
              <ModeBtn
                active={clubPool === "all"}
                onClick={() => setClubPool("all")}
                title="Tous les clubs"
                desc="Tout le championnat"
              />
            </div>
          </Field>

          <Field label="Effectif">
            <div className="flex gap-2">
              <ModeBtn
                active={!withSubs}
                onClick={() => setWithSubs(false)}
                title="XI seul"
                desc="11 titulaires"
              />
              <ModeBtn
                active={withSubs}
                onClick={() => setWithSubs(true)}
                title="Avec banc"
                desc="11 + 5 remplacants"
              />
            </div>
          </Field>

          <Field label="Mercato (mi-saison)">
            <div className="flex gap-2">
              <ModeBtn
                active={mercatoEnabled}
                onClick={() => setMercatoEnabled(true)}
                title="Active"
                desc="Echanges a la mi-saison"
              />
              <ModeBtn
                active={!mercatoEnabled}
                onClick={() => setMercatoEnabled(false)}
                title="Desactive"
                desc="Saison sans interruption"
              />
            </div>
          </Field>

          <Field label="Difficulte du tirage">
            <div className="flex gap-2">
              <ModeBtn
                active={difficulty === "normal"}
                onClick={() => setDifficulty("normal")}
                title="Normal"
                desc="Aucun reroll"
              />
              <ModeBtn
                active={difficulty === "easy"}
                onClick={() => setDifficulty("easy")}
                title="Easy"
                desc="3 rerolls"
              />
            </div>
          </Field>

          <button type="submit" className="retro-btn retro-btn-primary w-full">
            Lancer la saison
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
