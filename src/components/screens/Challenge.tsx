"use client";

import { shortName } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { PlayerCard } from "@/components/PlayerCard";
import { Pitch, type PitchSlot } from "@/components/Pitch";
import { ShareCard } from "@/components/ShareCard";
import { shareNodeAsImage } from "@/lib/shareImage";
import { MatchModal } from "@/components/MatchModal";
import { useChallenge, CHALLENGE_XI } from "@/lib/challenge";
import { HISTORICAL_TEAMS, getPlayer } from "@/lib/content/teams";
import { autoLineup, byPosition, lineStrengths } from "@/lib/engine/composition";
import { FORMATIONS } from "@/lib/engine/positions";
import type { Club, FormationName } from "@/lib/types";

/** Build pitch slots (filled + empty) from a free-draft XI for a formation. */
function challengePitchSlots(
  xi: string[],
  form: FormationName = "4-4-2"
): PitchSlot[] {
  const starters = autoLineup(xi, form).filter((e) => e.starter);
  const filled: PitchSlot[] = starters.map((e) => ({
    key: e.playerId,
    position: e.assignedPosition,
    player: getPlayer(e.playerId),
  }));
  const left = [...FORMATIONS[form].slots];
  for (const e of starters) {
    const i = left.indexOf(e.assignedPosition);
    if (i >= 0) left.splice(i, 1);
  }
  const empty: PitchSlot[] = left.map((pos, i) => ({
    key: `empty_${i}_${pos}`,
    position: pos,
  }));
  return [...filled, ...empty];
}

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
                    {[...draw.players].sort(byPosition).map((p) => (
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
                      Mode normal : pas de reroll.
                    </p>
                  )}
                </>
              )}
            </section>

            <aside className="retro-card p-4 h-fit lg:sticky lg:top-4">
              <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
                Ton XI ({xi.length}/{CHALLENGE_XI})
              </h3>
              <Pitch slots={challengePitchSlots(xi)} formation="4-4-2" />
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
  const xi = useChallenge((s) => s.xi);
  const start = useChallenge((s) => s.start);
  const reset = useChallenge((s) => s.reset);
  const [copied, setCopied] = useState(false);
  const [replay, setReplay] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgMsg, setImgMsg] = useState<string | null>(null);

  if (!result) return null;

  const shareImg = async () => {
    if (!cardRef.current) return;
    setImgMsg("Generation de l'image…");
    const m = await shareNodeAsImage(cardRef.current, "retro-league-defi.png");
    setImgMsg(m);
    setTimeout(() => setImgMsg(null), 6000);
  };

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
              <strong>{shortName(result.topScorer.name)}</strong> ({result.topScorer.goals}{" "}
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
          <button className="retro-btn retro-btn-gold" onClick={shareImg}>
            📸 Partager en image
          </button>
          <button className="retro-btn text-sm" onClick={share}>
            {copied ? "Copie !" : "🔗 Texte"}
          </button>
          <button className="retro-btn" onClick={() => start(teamName)}>
            Rejouer
          </button>
          <button className="retro-btn" onClick={reset}>
            Accueil
          </button>
        </div>
        {imgMsg && (
          <p className="mt-3 text-center text-sm text-gold font-semibold break-all">
            {imgMsg}
          </p>
        )}
      </motion.div>

      {/* Carte partagée (hors écran) pour la capture PNG. */}
      <div
        aria-hidden
        style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}
      >
        <ShareCard
          ref={cardRef}
          clubName={teamName}
          badge={verdict}
          overall={result.rating}
          lineRatings={(() => {
            const lr = lineStrengths(autoLineup(xi, result.formation));
            return {
              ATK: Math.round(lr.ATK),
              MID: Math.round(lr.MID),
              DEF: Math.round(lr.DEF),
              GK: Math.round(lr.GK),
            };
          })()}
          slots={challengePitchSlots(xi, result.formation)}
          formation={result.formation}
          stats={[
            { label: "Points", value: result.points },
            {
              label: "V-N-D",
              value: `${result.won}-${result.drawn}-${result.lost}`,
            },
            { label: "Buts", value: `${result.goalsFor}:${result.goalsAgainst}` },
            { label: "Classement", value: `${result.rank}/${result.totalClubs}` },
          ]}
          notes={[
            result.topScorer
              ? `Meilleur buteur : ${shortName(result.topScorer.name)} (${result.topScorer.goals})`
              : "",
            result.bestWin ? `Plus large victoire : ${result.bestWin}` : "",
          ].filter(Boolean)}
        />
      </div>

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
    r.topScorer ? `Meilleur buteur : ${shortName(r.topScorer.name)} (${r.topScorer.goals})` : "",
    r.legendaryHighlights[0] ? `« ${r.legendaryHighlights[0]} »` : "",
    `Score : ${r.score} — bats-moi sur Retro League.`,
  ];
  return lines.filter(Boolean).join("\n");
}
