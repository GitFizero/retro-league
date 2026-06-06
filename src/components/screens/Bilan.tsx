"use client";

import { Shell } from "@/components/Shell";
import type { SeasonReport } from "@/lib/report";

/**
 * Page bilan : rendu d'un SeasonReport. Utilisee a la fois en local (apres une
 * saison) et en mode "partage" quand un ami ouvre le lien (#bilan=...).
 */
export function Bilan({
  report,
  shared,
  onClose,
}: {
  report: SeasonReport;
  shared?: boolean;
  onClose?: () => void;
}) {
  const r = report;
  return (
    <Shell subtitle={`${r.leagueName} — Bilan saison ${r.season}`}>
      <div className="text-center mb-6">
        <span className="stamp text-lg">CHAMPION</span>
        <h2 className="font-display text-4xl font-black mt-4 text-retro">
          {r.champion}
        </h2>
        {r.humanRank > 0 && (
          <p className="mt-2 text-sm text-ink/70">
            {r.humanClubName} termine{" "}
            <strong>
              {r.humanRank}
              <sup>{r.humanRank === 1 ? "er" : "e"}</sup>
            </strong>
            .
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Panel title="Classement final">
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Club</th>
                  <th>G</th>
                  <th>N</th>
                  <th>P</th>
                  <th>Diff</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {r.standings.map((row) => (
                  <tr
                    key={row.rank}
                    className={row.human ? "bg-gold/20 font-semibold" : ""}
                  >
                    <td>{row.rank}</td>
                    <td>{row.name}</td>
                    <td>{row.w}</td>
                    <td>{row.d}</td>
                    <td>{row.l}</td>
                    <td>
                      {row.gd > 0 ? "+" : ""}
                      {row.gd}
                    </td>
                    <td className="font-display font-bold text-retro">
                      {row.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Meilleur joueur">
            {r.topScorers[0] ? (
              <p className="text-sm">
                <strong className="text-retro font-display text-lg">
                  {r.topScorers[0].name}
                </strong>
                <br />
                <span className="text-ink/60">
                  {r.topScorers[0].club} · {r.topScorers[0].goals} buts
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink/55 italic">—</p>
            )}
            {r.topScorers.length > 1 && (
              <ol className="mt-3 space-y-0.5 text-xs text-ink/70">
                {r.topScorers.slice(1).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {i + 2}. {s.name}
                    </span>
                    <span className="font-display">{s.goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Records">
            <Record label="Plus large victoire" value={r.biggestWin} />
            {r.humanBiggestWin && (
              <Record label="Ta plus belle victoire" value={r.humanBiggestWin} />
            )}
            {r.humanBiggestDefeat && (
              <Record label="Ta pire defaite" value={r.humanBiggestDefeat} />
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Moments cles" className="mt-6">
        {r.keyMoments.length === 0 ? (
          <p className="text-sm text-ink/55 italic">
            Pas de Moment Legendaire cette saison.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {r.keyMoments.map((m, i) => (
              <li key={i} className="text-sm italic text-ink/80">
                ★ &laquo; {m} &raquo;
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {shared ? (
          <a className="retro-btn retro-btn-primary" href={location.pathname}>
            Creer ma propre ligue →
          </a>
        ) : (
          onClose && (
            <button className="retro-btn" onClick={onClose}>
              ← Retour
            </button>
          )
        )}
      </div>
    </Shell>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm mb-2 last:mb-0">
      <span className="text-ink/60">{label} :</span>
      <br />
      <strong>{value}</strong>
    </p>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`retro-card p-5 ${className}`}>
      <h3 className="font-display font-bold uppercase text-sm tracking-wide border-b-2 border-ink/30 pb-2 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
