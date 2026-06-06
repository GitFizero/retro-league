"use client";

import { useMemo, useState } from "react";
import { shortName } from "@/lib/format";
import { Shell, SupportLink } from "@/components/Shell";
import { computeStandings } from "@/lib/engine/fixtures";
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
  const palmares = useGame((s) => s.palmares);
  const nextSeason = useGame((s) => s.nextSeason);
  const replaySeason = useGame((s) => s.replaySeason);
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
  const humanTitles = palmares.filter((p) => p.humanChampion).length;

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

  return (
    <Shell subtitle={`Hall of Fame — Saison ${seasonNumber} terminee`}>
      <div className="text-center mb-8">
        <span className="stamp text-lg">CHAMPION</span>
        <h2 className="font-display text-4xl font-black mt-4 text-retro">
          {champion?.clubName}
        </h2>
        <p className="text-ink/70 mt-1">
          {champion?.points} points · {champion?.won} victoires
        </p>
        {humanRank > 0 && (
          <p className="mt-3 text-sm text-ink/70">
            Votre club termine{" "}
            <strong>
              {humanRank}
              <sup>{humanRank === 1 ? "er" : "e"}</sup>
            </strong>
            .
          </p>
        )}
      </div>

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

        <Panel title={`Palmares — ${humanTitles} titre${humanTitles > 1 ? "s" : ""}`}>
          {palmares.length === 0 ? (
            <p className="text-sm text-ink/55 italic">
              Premiere saison. L&apos;histoire commence ici.
            </p>
          ) : (
            <ol className="space-y-1 text-sm">
              {[...palmares].reverse().map((p) => (
                <li
                  key={p.season}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    Saison {p.season} —{" "}
                    <span className={p.humanChampion ? "text-retro font-bold" : ""}>
                      {p.championName}
                    </span>
                  </span>
                  <span className="text-ink/50 text-xs shrink-0">
                    vous : {p.humanRank}
                    <sup>{p.humanRank === 1 ? "er" : "e"}</sup>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button className="retro-btn retro-btn-gold" onClick={shareBilan}>
          📤 Partager le bilan
        </button>
        <SupportLink variant="button" />
        <button
          className="retro-btn retro-btn-primary"
          onClick={() => nextSeason()}
        >
          Saison suivante →
        </button>
        <button
          className="retro-btn retro-btn-gold"
          onClick={() => replaySeason()}
          title="Rejoue immediatement une saison entiere avec le meme effectif"
        >
          ↻ Rejouer (rapide)
        </button>
        <button
          className="retro-btn text-sm"
          onClick={() => {
            if (confirm("Quitter et creer une nouvelle ligue ?")) reset();
          }}
        >
          Nouvelle ligue
        </button>
      </div>
      {shareMsg && (
        <p className="mt-3 text-center text-sm text-gold font-semibold break-all">
          {shareMsg}
        </p>
      )}
    </Shell>
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
