"use client";

import { useMemo, useRef, useState } from "react";
import { shortName } from "@/lib/format";
import { Shell, SupportLink } from "@/components/Shell";
import { computeStandings } from "@/lib/engine/fixtures";
import { teamRating, lineStrengths } from "@/lib/engine/composition";
import { getPlayer } from "@/lib/content/teams";
import { Pitch, type PitchSlot } from "@/components/Pitch";
import { ShareCard } from "@/components/ShareCard";
import { humanSeasonStats } from "@/lib/stats";
import { shareNodeAsImage } from "@/lib/shareImage";
import {
  useGame,
  HUMAN_CLUB_ID,
  topScorers,
  hallOfFameAwards,
} from "@/lib/store";
import { buildSeasonReport, reportLink } from "@/lib/report";

export function HallOfFame() {
  const league = useGame((s) => s.league);
  // Memoised locally — s.standings() returns a new array each render and would
  // make useSyncExternalStore loop (React #185).
  const standings = useMemo(
    () => (league ? computeStandings(league.clubs, league.fixtures) : []),
    [league]
  );
  const seasonNumber = useGame((s) => s.seasonNumber);
  const reset = useGame((s) => s.reset);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  if (!league) return null;

  const shareBilan = async () => {
    const link = reportLink(buildSeasonReport(league, seasonNumber));
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mon bilan Retro League", url: link });
        return;
      }
    } catch {
      // user cancelled share — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(link);
      setShareMsg("Lien copie ! Envoie-le a tes amis.");
    } catch {
      setShareMsg(link);
    }
    setTimeout(() => setShareMsg(null), 4000);
  };

  const champion = standings[0];
  const scorers = topScorers(league, 5);
  const { collections, achievements } = hallOfFameAwards(league, seasonNumber);

  // Biggest win across the season.
  let biggest = { label: "—", margin: -1 };
  for (const f of league.fixtures) {
    if (f.status !== "played" || f.homeScore == null || f.awayScore == null)
      continue;
    const margin = Math.abs(f.homeScore - f.awayScore);
    if (margin > biggest.margin) {
      const home = league.clubs.find((c) => c.id === f.homeClubId)?.name;
      const away = league.clubs.find((c) => c.id === f.awayClubId)?.name;
      biggest = {
        margin,
        label: `${home} ${f.homeScore}-${f.awayScore} ${away}`,
      };
    }
  }

  const humanRank =
    standings.findIndex((r) => r.clubId === HUMAN_CLUB_ID) + 1;

  // "Finished vs projected" (facon 38-0) : rang projete = classement par force
  // d'effectif. Termine au-dessus = surperformance.
  const humanClub = league.clubs.find((c) => c.id === HUMAN_CLUB_ID);
  const humanRow = standings.find((r) => r.clubId === HUMAN_CLUB_ID);
  const projected =
    [...league.clubs]
      .sort((a, b) => teamRating(b.lineup) - teamRating(a.lineup))
      .findIndex((c) => c.id === HUMAN_CLUB_ID) + 1;
  const verdict =
    humanRank > 0 && projected > 0
      ? humanRank < projected
        ? { label: "SURPERFORMANCE", tone: "text-[#2f7d4f]" }
        : humanRank > projected
          ? { label: "EN DESSOUS DES ATTENTES", tone: "text-retro" }
          : { label: "CONFORME AUX ATTENTES", tone: "text-gold" }
      : null;
  const humanXI: PitchSlot[] = humanClub
    ? humanClub.lineup
        .filter((e) => e.starter)
        .map((e) => ({
          key: e.playerId,
          position: e.assignedPosition,
          player: getPlayer(e.playerId),
        }))
    : [];

  const stats = humanClub ? humanSeasonStats(league, HUMAN_CLUB_ID) : null;
  const shareBadge =
    humanRank === 1
      ? "CHAMPION"
      : humanRank <= 3
        ? `PODIUM · ${humanRank}e`
        : `${humanRank}e / ${standings.length}`;
  const cardRef = useRef<HTMLDivElement>(null);
  const shareImage = async () => {
    if (!cardRef.current) return;
    setShareMsg("Generation de l'image…");
    const msg = await shareNodeAsImage(
      cardRef.current,
      `retro-league-${(humanClub?.name ?? "club").replace(/\s+/g, "-")}.png`
    );
    setShareMsg(msg);
    setTimeout(() => setShareMsg(null), 6000);
  };

  return (
    <Shell subtitle={`Hall of Fame — Saison ${seasonNumber} terminee`}>
      <div className="text-center mb-8">
        {humanRank === 1 ? (
          <span className="stamp text-lg">CHAMPION !</span>
        ) : humanRank <= 3 ? (
          <span className="stamp text-lg">PODIUM</span>
        ) : (
          <span className="font-display text-sm uppercase tracking-widest text-ink/50">
            Saison terminee
          </span>
        )}
        <h2 className="font-display text-4xl font-black mt-4">
          {humanClub?.name ?? "Mon Club"}
        </h2>
        {humanRank > 0 && humanRow && (
          <p className="text-ink/75 mt-1">
            <span className="text-retro font-display font-black text-2xl align-middle">
              {humanRank}
              <sup>{humanRank === 1 ? "er" : "e"}</sup>
            </span>{" "}
            sur {standings.length} · {humanRow.points} pts ·{" "}
            {humanRow.won}V {humanRow.drawn}N {humanRow.lost}D
          </p>
        )}
        <p className="text-xs text-ink/55 mt-2">
          Champion du championnat : <strong>{champion?.clubName}</strong> (
          {champion?.points} pts)
        </p>
      </div>

      {humanRow && (
        <div className="retro-card p-5 mb-6">
          <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
            <div>
              <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
                Votre onze — {humanClub?.name}
              </h3>
              <div className="max-w-[260px] mx-auto">
                {humanClub && <Pitch slots={humanXI} formation={humanClub.formation} />}
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-5xl font-black text-retro">
                  {humanRank}
                  <sup className="text-2xl">{humanRank === 1 ? "er" : "e"}</sup>
                </span>
                <span className="text-sm text-ink/60">
                  projete {projected}
                  <sup>{projected === 1 ? "er" : "e"}</sup>
                </span>
                {verdict && (
                  <span className={`font-display font-bold text-sm ${verdict.tone}`}>
                    {verdict.label}
                  </span>
                )}
              </div>
              {humanClub && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {([
                    ["ATT", lineStrengths(humanClub.lineup).ATK, "#C4122F"],
                    ["MIL", lineStrengths(humanClub.lineup).MID, "#7a6a2f"],
                    ["DEF", lineStrengths(humanClub.lineup).DEF, "#2b5d8a"],
                    ["GAR", lineStrengths(humanClub.lineup).GK, "#2f7d4f"],
                  ] as const).map(([label, val, color]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 border-2 rounded-sm px-2 py-1 font-display text-sm"
                      style={{ borderColor: color }}
                    >
                      <span className="text-[10px] tracking-wide text-ink/55">
                        {label}
                      </span>
                      <strong style={{ color }}>{Math.round(val)}</strong>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
                <Stat label="V" value={humanRow.won} tone="text-[#2f7d4f]" />
                <Stat label="N" value={humanRow.drawn} tone="text-gold" />
                <Stat label="D" value={humanRow.lost} tone="text-retro" />
                <Stat label="Pts" value={humanRow.points} />
                <Stat label="BP" value={humanRow.goalsFor} />
                <Stat label="BC" value={humanRow.goalsAgainst} />
                {stats && (
                  <Stat label="Clean sheets" value={stats.cleanSheets} />
                )}
                {stats && (
                  <Stat
                    label="Diff"
                    value={`${stats.goalDifference > 0 ? "+" : ""}${stats.goalDifference}`}
                  />
                )}
              </div>
              {stats && (
                <div className="mt-3 text-sm text-ink/75 space-y-0.5">
                  {stats.topScorer && (
                    <p>
                      ⚽ Meilleur buteur :{" "}
                      <strong>{stats.topScorer.name}</strong> (
                      {stats.topScorer.goals})
                    </p>
                  )}
                  {stats.biggestWin && (
                    <p>🏟️ Plus large victoire : {stats.biggestWin}</p>
                  )}
                  {stats.biggestDefeat && (
                    <p className="text-ink/55">
                      Plus lourde defaite : {stats.biggestDefeat}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Panel title="Meilleurs buteurs">
          <ol className="space-y-1">
            {scorers.map((s, i) => (
              <li
                key={s.player!.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {i + 1}. {shortName(s.player!.name)}{" "}
                  <span className="text-ink/50 text-xs">
                    {s.player!.club} {s.player!.season}
                  </span>
                </span>
                <span className="font-display font-bold text-retro">
                  {s.count}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Records">
          <p className="text-sm">
            <span className="text-ink/60">Plus large victoire :</span>
            <br />
            <strong>{biggest.label}</strong>
          </p>
        </Panel>

        <Panel title="Collections debloquees">
          {collections.length === 0 ? (
            <p className="text-sm text-ink/55 italic">
              Aucune collection cette saison.
            </p>
          ) : (
            <ul className="space-y-2">
              {collections.map((c) => (
                <li key={c.id}>
                  <span className="font-display font-bold text-gold">
                    ★ {c.name}
                  </span>
                  <p className="text-xs text-ink/65 italic">{c.flavor}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Succes">
          {achievements.length === 0 ? (
            <p className="text-sm text-ink/55 italic">
              Aucun succes debloque.
            </p>
          ) : (
            <ul className="space-y-2">
              {achievements.map((a) => (
                <li key={a.id}>
                  <span className="font-display font-bold">🏅 {a.name}</span>
                  <p className="text-xs text-ink/65">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button className="retro-btn retro-btn-gold" onClick={shareImage}>
          📸 Partager en image
        </button>
        <button className="retro-btn text-sm" onClick={shareBilan}>
          🔗 Lien
        </button>
        <SupportLink variant="button" />
        <button
          className="retro-btn retro-btn-primary"
          onClick={() => {
            if (confirm("Lancer une nouvelle partie ?")) reset();
          }}
        >
          Nouvelle partie →
        </button>
      </div>
      {shareMsg && (
        <p className="mt-3 text-center text-sm text-gold font-semibold break-all">
          {shareMsg}
        </p>
      )}

      {/* Carte partagée, rendue hors écran pour la capture PNG. */}
      {stats && humanClub && (
        <div
          aria-hidden
          style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}
        >
          <ShareCard
            ref={cardRef}
            clubName={humanClub.name}
            badge={shareBadge}
            overall={stats.overall}
            lineRatings={stats.lineRatings}
            slots={humanXI}
            formation={humanClub.formation}
            stats={[
              { label: "Points", value: stats.points },
              { label: "V-N-D", value: `${stats.won}-${stats.drawn}-${stats.lost}` },
              { label: "Buts", value: `${stats.goalsFor}:${stats.goalsAgainst}` },
              {
                label: "Diff",
                value: `${stats.goalDifference > 0 ? "+" : ""}${stats.goalDifference}`,
              },
              { label: "Clean sheets", value: stats.cleanSheets },
              { label: "Classement", value: `${stats.rank}/${stats.total}` },
            ]}
            notes={[
              stats.topScorer
                ? `Meilleur buteur : ${stats.topScorer.name} (${stats.topScorer.goals})`
                : "",
              stats.biggestWin ? `Plus large victoire : ${stats.biggestWin}` : "",
            ].filter(Boolean)}
          />
        </div>
      )}
    </Shell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="text-center border-2 border-ink/20 rounded-sm py-2">
      <div className={`font-display text-2xl font-black ${tone ?? "text-ink"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink/55">
        {label}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="retro-card p-5">
      <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
