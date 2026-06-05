/**
 * Generates supabase/seed.sql from the Content Bible (src/lib/content).
 * The TypeScript data stays the single source of truth; this emits the SQL
 * inserts for the read-only content tables.
 *
 * Run: npx vite-node --config vitest.config.ts scripts/generate-seed.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_PLAYERS, HISTORICAL_TEAMS } from "@/lib/content/teams";
import { LEGENDARY_MOMENTS } from "@/lib/content/legendary";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const qn = (s: string | undefined | null) => (s == null ? "null" : q(s));
const arr = (xs: string[]) => `'{${xs.map((x) => `"${x}"`).join(",")}}'`;
const textArr = (xs: string[]) =>
  `ARRAY[${xs.map((x) => q(x)).join(", ")}]::text[]`;

function build(): string {
  const out: string[] = [];
  out.push("-- AUTO-GENERATED from src/lib/content — do not edit by hand.");
  out.push("-- Regenerate: npx vite-node --config vitest.config.ts scripts/generate-seed.ts");
  out.push("");
  out.push("truncate legendary_moments, squad_players, players, historical_teams restart identity cascade;");
  out.push("");

  out.push("insert into historical_teams");
  out.push(
    "  (id, club_name, season, era, league, coach, final_position, points, description, mythic_tag)"
  );
  out.push("values");
  out.push(
    HISTORICAL_TEAMS.map(
      (t) =>
        `  (${q(t.id)}, ${q(t.clubName)}, ${q(t.season)}, ${q(t.era)}, ${q(
          t.league
        )}, ${q(t.coach)}, ${t.finalPosition}, ${t.points}, ${q(
          t.description
        )}, ${qn(t.mythicTag)})`
    ).join(",\n") + ";"
  );
  out.push("");

  out.push("insert into players");
  out.push(
    "  (id, name, position, secondary_positions, overall, potential, age, nationality, decade, historical_team_id, club, season, era)"
  );
  out.push("values");
  out.push(
    ALL_PLAYERS.map(
      (p) =>
        `  (${q(p.id)}, ${q(p.name)}, ${q(p.position)}, ${arr(
          p.secondaryPositions
        )}, ${p.overall}, ${p.potential}, ${p.age}, ${q(p.nationality)}, ${
          p.decade
        }, ${q(p.historicalTeamId)}, ${q(p.club)}, ${q(p.season)}, ${q(p.era)})`
    ).join(",\n") + ";"
  );
  out.push("");

  out.push("insert into legendary_moments");
  out.push("  (player_match, archetype, trigger, bonus, narration)");
  out.push("values");
  out.push(
    LEGENDARY_MOMENTS.map(
      (m) =>
        `  (${q(m.playerMatch)}, ${q(m.archetype)}, ${q(m.trigger)}, ${
          m.bonus
        }, ${textArr(m.narration)})`
    ).join(",\n") + ";"
  );
  out.push("");

  return out.join("\n");
}

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../supabase/seed.sql");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, build(), "utf8");
console.log(
  `Wrote ${target}: ${HISTORICAL_TEAMS.length} teams, ${ALL_PLAYERS.length} players, ${LEGENDARY_MOMENTS.length} moments.`
);
