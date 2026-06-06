import { computeStandings } from "@/lib/engine/fixtures";
import { getPlayer } from "@/lib/content/teams";
import { shortName } from "@/lib/format";
import { HUMAN_CLUB_ID, topScorers } from "@/lib/store";
import type { League } from "@/lib/types";

/**
 * BILAN DE FIN DE SAISON — partageable par lien.
 * On encode un resume compact dans le hash de l'URL : aucun backend requis,
 * un ami ouvre le lien et tombe sur la page bilan (classement final, moments
 * cles, plus grosse victoire/defaite, meilleur joueur).
 */

export interface ReportRow {
  rank: number;
  name: string;
  pts: number;
  w: number;
  d: number;
  l: number;
  gd: number;
  human: boolean;
}

export interface SeasonReport {
  v: 1;
  leagueName: string;
  season: number;
  champion: string;
  humanClubName: string;
  humanRank: number;
  standings: ReportRow[];
  topScorers: { name: string; club: string; goals: number }[];
  biggestWin: string;
  humanBiggestWin?: string;
  humanBiggestDefeat?: string;
  keyMoments: string[];
}

export function buildSeasonReport(
  league: League,
  season: number
): SeasonReport {
  const standings = computeStandings(league.clubs, league.fixtures);
  const name = (id: string) =>
    league.clubs.find((c) => c.id === id)?.name ?? id;

  let biggest = { margin: -1, label: "—" };
  let hWin = { margin: 0, label: "" };
  let hLoss = { margin: 0, label: "" };

  for (const f of league.fixtures) {
    if (f.status !== "played" || f.homeScore == null || f.awayScore == null)
      continue;
    const margin = Math.abs(f.homeScore - f.awayScore);
    const label = `${name(f.homeClubId)} ${f.homeScore}-${f.awayScore} ${name(
      f.awayClubId
    )}`;
    if (margin > biggest.margin) biggest = { margin, label };

    const human =
      f.homeClubId === HUMAN_CLUB_ID
        ? "home"
        : f.awayClubId === HUMAN_CLUB_ID
          ? "away"
          : null;
    if (human) {
      const gf = human === "home" ? f.homeScore : f.awayScore;
      const ga = human === "home" ? f.awayScore : f.homeScore;
      if (gf - ga > hWin.margin) hWin = { margin: gf - ga, label };
      if (ga - gf > hLoss.margin) hLoss = { margin: ga - gf, label };
    }
  }

  const moments: { human: boolean; text: string }[] = [];
  for (const f of league.fixtures) {
    for (const e of f.events) {
      if (e.type === "legendary") {
        moments.push({ human: e.clubId === HUMAN_CLUB_ID, text: e.description });
      }
    }
  }
  moments.sort((a, b) => (b.human ? 1 : 0) - (a.human ? 1 : 0));

  return {
    v: 1,
    leagueName: league.name,
    season,
    champion: standings[0]?.clubName ?? "—",
    humanClubName: name(HUMAN_CLUB_ID),
    humanRank: standings.findIndex((r) => r.clubId === HUMAN_CLUB_ID) + 1,
    standings: standings.map((r, i) => ({
      rank: i + 1,
      name: r.clubName,
      pts: r.points,
      w: r.won,
      d: r.drawn,
      l: r.lost,
      gd: r.goalDifference,
      human: r.clubId === HUMAN_CLUB_ID,
    })),
    topScorers: topScorers(league, 5).map((s) => ({
      name: shortName(s.player!.name),
      club: s.player!.club,
      goals: s.count,
    })),
    biggestWin: biggest.label,
    humanBiggestWin: hWin.label || undefined,
    humanBiggestDefeat: hLoss.label || undefined,
    keyMoments: moments.slice(0, 6).map((m) => m.text),
  };
}

// ----------------------------------------------------------- URL encoding ---

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64decode(b64: string): string {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeReport(r: SeasonReport): string {
  return b64encode(JSON.stringify(r));
}

export function decodeReport(s: string): SeasonReport | null {
  try {
    const r = JSON.parse(b64decode(s));
    // Valider la FORME, pas seulement la version : un lien forge ne doit jamais
    // faire planter le rendu du bilan (champs manquants -> .map sur undefined).
    if (
      !r ||
      r.v !== 1 ||
      typeof r.leagueName !== "string" ||
      typeof r.champion !== "string" ||
      typeof r.humanClubName !== "string" ||
      !Array.isArray(r.standings) ||
      !Array.isArray(r.topScorers) ||
      !Array.isArray(r.keyMoments)
    ) {
      return null;
    }
    return r as SeasonReport;
  } catch {
    return null;
  }
}

/** Full shareable link to the bilan page. */
export function reportLink(r: SeasonReport): string {
  const base =
    typeof location !== "undefined"
      ? `${location.origin}${location.pathname}`
      : "";
  return `${base}#bilan=${encodeReport(r)}`;
}

/** Read a shared report from the current URL hash, if any. */
export function readReportFromHash(): SeasonReport | null {
  if (typeof location === "undefined") return null;
  const m = location.hash.match(/#bilan=(.+)$/);
  return m ? decodeReport(m[1]) : null;
}
