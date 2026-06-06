// Genere src/lib/content/fifa.generated.ts depuis le dataset FIFA (legacy,
// FIFA 15-23) filtre sur la Ligue 1 -> tous les clubs de chaque saison.
//
// Regenerer :
//   curl -sL "https://huggingface.co/datasets/jsulz/FIFA23/resolve/main/male_players%20(legacy).csv" -o /tmp/fifa.csv
//   node scripts/generate-fifa.mjs /tmp/fifa.csv
//
// Source : dataset open "FIFA 15-23 complete player dataset" (Sofifa), via
// HuggingFace. Noms affiches en initiale + nom (short_name) cote IP.
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const INPUT = process.argv[2] || "/tmp/fifa_legacy.csv";
const OUT = "src/lib/content/fifa.generated.ts";
const MAX_PER_CLUB = 20;

const POS = {
  GK: "G", CB: "DC", RB: "DD", LB: "DG", RWB: "DD", LWB: "DG",
  CDM: "MDC", CM: "MC", CAM: "MOC", RM: "MD", LM: "MG",
  RW: "AD", LW: "AG", ST: "BU", CF: "BU",
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");

const rows = []; // {v, name, positions, ovr, age, nat, club}
let idx = null;

const rl = createInterface({ input: createReadStream(INPUT), crlfDelay: Infinity });
let header = true;
for await (const line of rl) {
  const f = parseCsvLine(line);
  if (header) {
    idx = {};
    f.forEach((name, i) => (idx[name.trim()] = i));
    header = false;
    continue;
  }
  if (f[idx.league_name] !== "Ligue 1") continue;
  const name = (f[idx.short_name] || "").trim();
  const club = (f[idx.club_name] || "").trim();
  if (!name || !club) continue;
  rows.push({
    v: parseInt(f[idx.fifa_version], 10),
    name,
    positions: (f[idx.player_positions] || "").split(",").map((s) => s.trim()).filter(Boolean),
    ovr: parseInt(f[idx.overall], 10) || 60,
    age: parseInt(f[idx.age], 10) || 24,
    nat: (f[idx.nationality_name] || "France").trim(),
    club,
  });
}

// Group by version+club.
const byTeam = new Map();
for (const r of rows) {
  const key = `${r.v}__${r.club}`;
  if (!byTeam.has(key)) byTeam.set(key, []);
  byTeam.get(key).push(r);
}

const teams = [];
const players = [];
const strengthByVersion = new Map(); // v -> [{teamId, strength}]

for (const [key, list] of byTeam) {
  const [v, club] = [parseInt(key.split("__")[0], 10), key.split("__").slice(1).join("__")];
  list.sort((a, b) => b.ovr - a.ovr);
  const squad = list.slice(0, MAX_PER_CLUB);
  if (squad.length < 11) continue;

  const startYear = 2000 + v - 1;
  const season = `${startYear}-${String(startYear + 1).slice(2)}`;
  const era = v <= 19 ? "E2015" : "MODERNE";
  const decade = Math.floor(startYear / 10) * 10;
  const teamId = `FIFA${v}_${slug(club)}`;
  const strength = squad.slice(0, 11).reduce((s, p) => s + p.ovr, 0) / 11;

  if (!strengthByVersion.has(v)) strengthByVersion.set(v, []);
  strengthByVersion.get(v).push({ teamId, strength });

  squad.forEach((p, i) => {
    const mapped = p.positions.map((x) => POS[x]).filter(Boolean);
    const primary = mapped[0] || "MC";
    const secondary = [...new Set(mapped.slice(1))].filter((x) => x !== primary);
    players.push({
      id: `${teamId}_${i}_${slug(p.name)}`.slice(0, 60),
      name: p.name,
      position: primary,
      secondaryPositions: secondary,
      overall: p.ovr,
      potential: Math.min(99, p.ovr + Math.max(0, 24 - p.age)),
      age: p.age,
      nationality: p.nat,
      decade,
      historicalTeamId: teamId,
      club,
      season,
      era,
    });
  });

  teams.push({
    id: teamId,
    clubName: club,
    season,
    era,
    league: "Championnat de France",
    coach: "—",
    finalPosition: 0, // rempli ensuite
    points: 0,
    description: `${club}, saison ${season}. Mene par ${squad[0].name}.`,
    _v: v,
  });
}

// Classement approximatif par force d'effectif (proxy faute de standings).
for (const [, arr] of strengthByVersion) {
  arr.sort((a, b) => b.strength - a.strength);
  arr.forEach((e, i) => {
    const t = teams.find((x) => x.id === e.teamId);
    t.finalPosition = i + 1;
    t.points = Math.max(20, 84 - i * 3);
  });
}
for (const t of teams) delete t._v;

const ts = `// @generated par scripts/generate-fifa.mjs — NE PAS EDITER A LA MAIN.
// Tous les clubs de Ligue 1, FIFA 15-23 (saisons 2014-15 a 2022-23).
// Source : dataset open FIFA/Sofifa via HuggingFace. Classement = approximation
// par force d'effectif (pas de standings officiels dans le dataset).
import type { HistoricalTeam, Player } from "@/lib/types";

// Donnees encodees en JSON (parse a l'import) pour eviter l'inference d'un
// type litteral geant (TS2590).
export const FIFA_TEAMS = JSON.parse(
  ${JSON.stringify(JSON.stringify(teams))}
) as HistoricalTeam[];

export const FIFA_PLAYERS = JSON.parse(
  ${JSON.stringify(JSON.stringify(players))}
) as Player[];
`;

writeFileSync(OUT, ts);
console.log(`OK -> ${OUT}`);
console.log(`teams: ${teams.length} | players: ${players.length}`);
const perV = {};
for (const t of teams) perV[t.season] = (perV[t.season] || 0) + 1;
console.log("clubs par saison:", perV);
