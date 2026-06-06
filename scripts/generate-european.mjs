// Genere src/lib/content/european.generated.ts depuis l'European Soccer Database
// (Kaggle: hugomathien/soccer) filtre sur la France Ligue 1, saisons 2008-09 a
// 2013-14 (les saisons 2014-15+ viennent du dataset FIFA).
//
// Regenerer :
//   curl -sL "https://www.kaggle.com/api/v1/datasets/download/hugomathien/soccer" -o /tmp/soccer.zip
//   unzip -o /tmp/soccer.zip -d /tmp/soccerdb
//   node scripts/generate-european.mjs /tmp/soccerdb/database.sqlite
//
// Atouts vs FIFA : vrais effectifs (titularisations reelles) et VRAI classement
// final (calcule depuis les resultats). Postes deduits des coordonnees X/Y.
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { toCity } from "./cities.mjs";

const DB = process.argv[2] || "/tmp/soccerdb/database.sqlite";
const OUT = "src/lib/content/european.generated.ts";
const FR = 4769; // France Ligue 1
const SEASONS = [
  "2008/2009", "2009/2010", "2010/2011",
  "2011/2012", "2012/2013", "2013/2014",
];
const MAX_PER_CLUB = 18;

const db = new DatabaseSync(DB, { readOnly: true });
const all = (s, ...p) => db.prepare(s).all(...p);
const one = (s, ...p) => db.prepare(s).get(...p);

// L'European DB utilise quelques formes propres -> on les ramene a une cle
// connue de la table villes avant mapping.
const PRE = {
  "Girondins de Bordeaux": "FC Girondins de Bordeaux",
  "Toulouse FC": "Toulouse Football Club",
  "SM Caen": "Stade Malherbe Caen",
  "Evian Thonon Gaillard FC": "Évian Thonon Gaillard FC",
};
const canon = (c) => toCity(PRE[c] || c);

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Poste a partir des coordonnees moyennes (Y: 1 gardien -> 11 attaque ; X: 1
// gauche -> 9 droite).
function posFromXY(y, x) {
  if (y <= 2) return "G";
  const side = x <= 3.5 ? "L" : x >= 6.5 ? "R" : "C";
  if (y <= 4.5) return side === "L" ? "DG" : side === "R" ? "DD" : "DC";
  if (y <= 7.5) {
    if (side === "L") return "MG";
    if (side === "R") return "MD";
    return y <= 6 ? "MDC" : "MOC";
  }
  return side === "L" ? "AG" : side === "R" ? "AD" : "BU";
}

function shorten(full) {
  const clean = full.replace(/,.*$/, "").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(" ")}`;
}

const ovrStmt = db.prepare(
  "SELECT overall_rating o FROM Player_Attributes WHERE player_api_id=? AND overall_rating IS NOT NULL AND date<=? ORDER BY date DESC LIMIT 1"
);
const ovrFallback = db.prepare(
  "SELECT overall_rating o FROM Player_Attributes WHERE player_api_id=? AND overall_rating IS NOT NULL ORDER BY date ASC LIMIT 1"
);
const playerStmt = db.prepare(
  "SELECT player_name n, birthday b FROM Player WHERE player_api_id=?"
);

const teams = [];
const players = [];

for (const season of SEASONS) {
  const startYear = parseInt(season.slice(0, 4), 10);
  const seasonLabel = `${startYear}-${String(startYear + 1).slice(2)}`;
  const era = startYear <= 2009 ? "E2007" : "E2010";
  const decade = Math.floor(startYear / 10) * 10;
  const seasonEnd = `${startYear + 1}-07-01`;

  const matches = all(
    "SELECT * FROM Match WHERE league_id=? AND season=?",
    FR,
    season
  );

  // Vrai classement : points/diff depuis les resultats.
  const table = new Map(); // teamId -> {pts, gf, ga}
  const bump = (id) => {
    if (!table.has(id)) table.set(id, { pts: 0, gf: 0, ga: 0 });
    return table.get(id);
  };
  for (const m of matches) {
    if (m.home_team_goal == null || m.away_team_goal == null) continue;
    const h = bump(m.home_team_api_id), a = bump(m.away_team_api_id);
    h.gf += m.home_team_goal; h.ga += m.away_team_goal;
    a.gf += m.away_team_goal; a.ga += m.home_team_goal;
    if (m.home_team_goal > m.away_team_goal) h.pts += 3;
    else if (m.home_team_goal < m.away_team_goal) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }
  const ranking = [...table.entries()]
    .map(([id, t]) => ({ id, ...t, gd: t.gf - t.ga }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  const rankOf = new Map(ranking.map((r, i) => [r.id, i + 1]));
  const ptsOf = new Map(ranking.map((r) => [r.id, r.pts]));

  const teamIds = [...table.keys()];
  for (const teamApiId of teamIds) {
    const rawName = one(
      "SELECT team_long_name n FROM Team WHERE team_api_id=?",
      teamApiId
    )?.n;
    if (!rawName) continue;
    const club = canon(rawName.trim());

    // Titularisations + coordonnees par joueur.
    const agg = new Map(); // pid -> {n, ys:[], xs:[]}
    for (const side of ["home", "away"]) {
      for (const m of matches) {
        if (m[`${side}_team_api_id`] !== teamApiId) continue;
        for (let i = 1; i <= 11; i++) {
          const pid = m[`${side}_player_${i}`];
          if (!pid) continue;
          const y = m[`${side}_player_Y${i}`];
          const x = m[`${side}_player_X${i}`];
          if (!agg.has(pid)) agg.set(pid, { n: 0, ys: [], xs: [] });
          const e = agg.get(pid);
          e.n++;
          if (y != null) e.ys.push(y);
          if (x != null) e.xs.push(x);
        }
      }
    }

    const squad = [...agg.entries()]
      .map(([pid, e]) => ({ pid, n: e.n, y: median(e.ys), x: median(e.xs) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, MAX_PER_CLUB);
    if (squad.length < 11) continue;

    const teamId = `ESD${startYear}_${slug(club)}`;
    const built = [];
    for (const s of squad) {
      const pl = playerStmt.get(s.pid);
      if (!pl) continue;
      const ovr =
        (ovrStmt.get(s.pid, seasonEnd) || ovrFallback.get(s.pid) || {}).o ?? 68;
      const birthYear = pl.b ? parseInt(String(pl.b).slice(0, 4), 10) : null;
      const age = birthYear ? startYear + 1 - birthYear : 26;
      built.push({
        pid: s.pid,
        name: shorten(pl.n),
        position: posFromXY(s.y || 6, s.x || 5),
        overall: ovr,
        age,
      });
    }
    if (built.length < 11) continue;
    built.sort((a, b) => b.overall - a.overall);
    const star = built[0];

    built.forEach((p, i) => {
      players.push({
        id: `${teamId}_${i}_${slug(p.name)}`.slice(0, 60),
        name: p.name,
        position: p.position,
        secondaryPositions: [],
        overall: p.overall,
        potential: Math.min(99, p.overall + Math.max(0, 24 - p.age)),
        age: p.age,
        nationality: "—",
        decade,
        historicalTeamId: teamId,
        club,
        season: seasonLabel,
        era,
      });
    });

    teams.push({
      id: teamId,
      clubName: club,
      season: seasonLabel,
      era,
      league: "Championnat de France",
      coach: "—",
      finalPosition: rankOf.get(teamApiId) ?? 0,
      points: ptsOf.get(teamApiId) ?? 0,
      description: `${club}, saison ${seasonLabel}. Mene par ${star.name}.`,
    });
  }
}

const ts = `// @generated par scripts/generate-european.mjs — NE PAS EDITER A LA MAIN.
// Ligue 1 2008-09 a 2013-14, depuis l'European Soccer Database (Kaggle,
// hugomathien/soccer). Effectifs = titularisations reelles ; classement = VRAI
// classement final (calcule depuis les resultats) ; postes deduits des
// coordonnees X/Y des compositions.
import type { HistoricalTeam, Player } from "@/lib/types";

export const EUROPEAN_TEAMS = JSON.parse(
  ${JSON.stringify(JSON.stringify(teams))}
) as HistoricalTeam[];

export const EUROPEAN_PLAYERS = JSON.parse(
  ${JSON.stringify(JSON.stringify(players))}
) as Player[];
`;

writeFileSync(OUT, ts);
console.log(`OK -> ${OUT}`);
console.log(`teams: ${teams.length} | players: ${players.length}`);
const perS = {};
for (const t of teams) perS[t.season] = (perS[t.season] || 0) + 1;
console.log("clubs/saison:", perS);
