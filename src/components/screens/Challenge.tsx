"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { PlayerCard } from "@/components/PlayerCard";
import { MatchModal } from "@/components/MatchModal";
import { useChallenge, CHALLENGE_XI } from "@/lib/challenge";
import { HISTORICAL_TEAMS, getPlayer } from "@/lib/content/teams";
import type { Club } from "@/lib/types";

export function Challenge() {
  const phase = useChallenge((s) => s.phase);
  if (phase === "result") return <ChallengeResult />;
  return <ChallengeDraft />;
}

const TEAM_LABELS = HISTORICAL_TEAMS.map((t) => `${t.clubName} ${t.season}`);

function ChallengeDraft() {
  const draw = useChallenge((s) => s.draw);
  const xi = useChallenge((s) => s.xi);
  const pick = useChallenge((s) => s.pick);
  const spin = useChallenge((s) => s.spin);
  const undo = useChallenge((s) => s.undo);
  const run = useChallenge((s) => s.run);
  const reset = useChallenge((s) => s.reset);
  const rerollsLeft = useChallenge((s) => s.rerollsLeft);

  // Slot-machine roll whenever a new draw arrives.
  const [rolling, setRolling] = useState(false);
  const [rollLabel, setRollLabel] = useState("");
  const drawKey = draw?.team.id ?? "none";
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!draw) return;
    setRolling(true);
    let ticks = 0;
    rollTimer.current = setInterval(() => {
      setRollLabel(TEAM_LABELS[Math.floor(Math.random() * TEAM_LABELS.length)]);
      if (++ticks > 9) {
        if (rollTimer.current) clearInterval(rollTimer.current);
        setRolling(false);
      }
    }, 70);
    return () => {
      if (rollTimer.current) clearInterval(rollTimer.current);
    };
  }, [drawKey, draw]);

  const ready = xi.length >= CHALLENGE_XI;

  return (
    <Shell subtitle="Mode Defi — reussis la saison parfaite">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="font-display text-lg">
          Joueur <span className="text-retro font-bold">{xi.length}</span> /{" "}
          {CHALLENGE_XI}
        </div>
        <div className="flex items-center gap-2">
          {rerollsLeft > 0 && (
            <span className="text-xs font-display text-gold border border-gold rounded px-2 py-0.5">
              {rerollsLeft} reroll{rerollsLeft > 1 ? "s" : ""}
            </span>
          )}
          {xi.length > 0 && rerollsLeft > 0 && (
            <button className="retro-btn text-xs" onClick={undo}>
              ↩ Annuler
            </button>
          )}
          <button
            className="retro-btn text-xs"
            onClick={() => confirm("Quitter le defi ?") && reset()}
          >
            Quitter
          </button>
        </div>
      </div>

      <div className="w-full h-2 bg-paper-dark border border-ink/40 rounded mb-6 overflow-hidden">
        <div
          className="h-full bg-retro transition-all"
          style={{ width: `${(xi.length / CHALLENGE_XI) * 100}%` }}
        />
      </div>

      {ready ? (
        <div className="retro-card p-8 text-center space-y-4">
          <div className="font-display text-2xl font-bold">
            Ton XI est complet !
          </div>
          <p className="text-ink/70">
            11 legendes reunies. Lance la saison et vois si tu peux finir
            invaincu.
          </p>
          <button
            className="retro-btn retro-btn-primary text-lg px-8"
            onClick={run}
          >
            Lancer la saison →
          </button>
        </div>
      ) : (
        draw && (
          <div className="grid lg:grid-cols-[1fr_260px] gap-6">
            <section className="retro-card p-5">
              <div className="border-b-2 border-ink/30 pb-3 mb-4 text-center">
                <div className="text-[11px] uppercase tracking-widest text-ink/50">
                  La roue s&apos;arrete sur
                </div>
                <motion.div
                  key={drawKey + (rolling ? "r" : "s")}
                  initial={{ opacity: 0.5, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`font-display font-black text-2xl ${
                    rolling ? "text-ink/40 blur-[0.5px]" : "text-retro"
                  }`}
                >
                  {rolling ? rollLabel : `${draw.team.clubName} ${draw.team.season}`}
                </motion.div>
                {!rolling && draw.team.mythicTag && (
                  <span className="stamp text-[10px] mt-2">
                    {draw.team.mythicTag}
                  </span>
                )}
              </div>

              {!rolling && (
                <>
                  <p className="font-display text-sm uppercase tracking-wide text-ink/60 mb-2 text-center">
                    Choisis UN joueur
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {draw.players.map((p) => (
                      <PlayerCard
                        key={p.id}
                        player={p}
                        onClick={() => pick(p.id)}
                      />
                    ))}
                  </div>
                  {rerollsLeft > 0 ? (
                    <button className="retro-btn mt-5 text-xs" onClick={spin}>
                      ↻ Relancer la roue ({rerollsLeft})
                    </button>
                  ) : (
                    <p className="mt-5 text-xs text-ink/50 italic">
                      Mode normal : pas de reroll. Assume ton tirage.
                    </p>
                  )}
                </>
              )}
            </section>

            <aside className="retro-card p-4 h-fit lg:sticky lg:top-4">
              <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
                Ton XI
              </h3>
              {xi.length === 0 ? (
                <p className="text-sm text-ink/55 italic">
                  Fais tourner la roue et compose ton equipe de reve.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {xi
                    .map(getPlayer)
                    .filter((p): p is NonNullable<typeof p> => Boolean(p))
                    .map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
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
        )
      )}
    </Shell>
  );
}

function ChallengeResult() {
  const result = useChallenge((s) => s.result);
  const teamName = useChallenge((s) => s.teamName);
  const start = useChallenge((s) => s.start);
  const reset = useChallenge((s) => s.reset);
  const [copied, setCopied] = useState(false);
  const [replay, setReplay] = useState(false);

  if (!result) return null;

  // Minimal Club stubs for the match viewer (it only needs id + name).
  const replayClubs = result.highlight
    ? ([
        { ...EMPTY_CLUB, ...result.highlight.home },
        { ...EMPTY_CLUB, ...result.highlight.away },
      ] as Club[])
    : [];

  const verdict = result.perfectSeason
    ? "SAISON PARFAITE"
    : result.unbeaten
      ? "INVAINCU"
      : result.champion
        ? "CHAMPION"
        : `${result.rank}e sur ${result.totalClubs}`;

  const shareText = buildShareText(result);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Retro League — Mode Defi", text: shareText });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Shell subtitle="Mode Defi — le verdict">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="retro-card p-6 max-w-xl mx-auto"
      >
        <div className="text-center border-b-4 border-double border-ink pb-4 mb-4">
          <div className="text-xs uppercase tracking-[0.3em] text-ink/50">
            {result.formation} · Note {result.rating}
          </div>
          <h2 className="font-display font-black text-3xl mt-1">{teamName}</h2>
          <div className="mt-3">
            <span
              className={`stamp text-base ${
                result.unbeaten ? "" : "border-ink text-ink"
              }`}
            >
              {verdict}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center mb-5">
          <Stat label="Pts" value={result.points} highlight />
          <Stat label="V-N-D" value={`${result.won}-${result.drawn}-${result.lost}`} />
          <Stat label="BP-BC" value={`${result.goalsFor}-${result.goalsAgainst}`} />
          <Stat label="Rang" value={`${result.rank}/${result.totalClubs}`} />
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b border-ink/20 pb-1">
            L&apos;histoire de ta saison
          </h3>
          {result.topScorer && (
            <p className="text-sm">
              ⚽ Meilleur buteur :{" "}
              <strong>{result.topScorer.name}</strong> ({result.topScorer.goals}{" "}
              buts)
            </p>
          )}
          {result.bestWin && (
            <p className="text-sm">🏟️ Plus large victoire : {result.bestWin}</p>
          )}
          {result.legendaryHighlights.length > 0 ? (
            <ul className="space-y-1.5">
              {result.legendaryHighlights.map((h, i) => (
                <li key={i} className="text-sm italic text-ink/80">
                  <span className="text-gold">★</span> &laquo; {h} &raquo;
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink/55 italic">
              Une saison sans coup d&apos;eclat legendaire… recompose ton XI
              autour d&apos;une vraie star.
            </p>
          )}
        </div>

        {result.highlight && (
          <button
            className="retro-btn retro-btn-primary w-full mt-5"
            onClick={() => setReplay(true)}
          >
            ▶ Revivre le match de ta saison
          </button>
        )}

        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          <button className="retro-btn retro-btn-gold" onClick={share}>
            {copied ? "Copie !" : "Partager mon defi"}
          </button>
          <button
            className="retro-btn"
            onClick={() => start(teamName)}
          >
            Rejouer
          </button>
          <button className="retro-btn" onClick={reset}>
            Accueil
          </button>
        </div>
      </motion.div>

      {replay && result.highlight && (
        <MatchModal
          fixture={result.highlight.fixture}
          clubs={replayClubs}
          live
          onClose={() => setReplay(false)}
        />
      )}
    </Shell>
  );
}

const EMPTY_CLUB: Omit<Club, "id" | "name"> = {
  isAI: false,
  squad: [],
  lineup: [],
  formation: "4-4-2",
  form: 0,
};

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="border-2 border-ink/30 rounded-sm py-2">
      <div
        className={`font-display font-bold text-lg ${
          highlight ? "text-retro" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink/50">
        {label}
      </div>
    </div>
  );
}

function buildShareText(r: ReturnType<typeof useChallenge.getState>["result"]): string {
  if (!r) return "";
  const verdict = r.perfectSeason
    ? "SAISON PARFAITE (invaincu + champion)"
    : r.unbeaten
      ? "INVAINCU"
      : r.champion
        ? "CHAMPION"
        : `${r.rank}e/${r.totalClubs}`;
  const lines = [
    `RETRO LEAGUE — Mode Defi`,
    `${r.teamName} (${r.formation}, note ${r.rating})`,
    `${verdict} — ${r.points} pts, ${r.won}V ${r.drawn}N ${r.lost}D`,
    r.topScorer ? `Meilleur buteur : ${r.topScorer.name} (${r.topScorer.goals})` : "",
    r.legendaryHighlights[0] ? `« ${r.legendaryHighlights[0]} »` : "",
    `Score : ${r.score} — bats-moi sur Retro League.`,
  ];
  return lines.filter(Boolean).join("\n");
}
