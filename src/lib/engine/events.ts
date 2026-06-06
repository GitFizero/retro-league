import { getPlayer } from "@/lib/content/teams";
import { shortName } from "@/lib/format";
import { pickYouth } from "@/lib/content/youth";
import {
  OFF_PITCH_EVENTS,
  renderText,
  type OffPitchTemplate,
} from "@/lib/content/events";
import { autoLineup } from "@/lib/engine/composition";
import type { Rng } from "@/lib/engine/rng";
import type { Club, NewsItem, Player } from "@/lib/types";

/** Pick a "victim" player — biased toward squad role players, not the star. */
function pickVictim(club: Club, rng: Rng): Player | undefined {
  const players = club.squad
    .map(getPlayer)
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => a.overall - b.overall);
  if (players.length === 0) return undefined;
  // bottom ~70% so we rarely nuke the best player
  const pool = players.slice(0, Math.max(1, Math.floor(players.length * 0.7)));
  return rng.pick(pool);
}

function replaceWithYouth(
  club: Club,
  victim: Player,
  rng: Rng
): { club: Club; youth: Player } | null {
  const owned = new Set(club.squad);
  const youth = pickYouth(rng, victim.position, owned);
  if (!youth) return null; // academie epuisee -> on ne remplace pas (squad intact)
  const squad = [...club.squad.filter((id) => id !== victim.id), youth.id];
  return {
    club: { ...club, squad, lineup: autoLineup(squad, club.formation) },
    youth,
  };
}

export interface OffPitchOutcome {
  club: Club;
  news: NewsItem;
}

/**
 * Roll one "fait divers" for a club and apply its effect to a copy of the club.
 * Returns null when nothing happens.
 */
export function rollOffPitch(
  club: Club,
  rng: Rng,
  matchday: number,
  probability: number
): OffPitchOutcome | null {
  if (!rng.bool(probability)) return null;

  const tpl = rng.weighted(
    OFF_PITCH_EVENTS,
    OFF_PITCH_EVENTS.map((e) => e.weight)
  );
  return applyTemplate(club, tpl, rng, matchday);
}

function applyTemplate(
  club: Club,
  tpl: OffPitchTemplate,
  rng: Rng,
  matchday: number
): OffPitchOutcome {
  let next = club;
  let playerName: string | undefined;
  let youthName: string | undefined;

  switch (tpl.effect.kind) {
    case "points":
      next = {
        ...club,
        pointsPenalty: (club.pointsPenalty ?? 0) + Math.abs(tpl.effect.value),
      };
      break;
    case "forfeit":
      next = { ...club, forfeitNext: true };
      break;
    case "replace": {
      const victim = pickVictim(club, rng);
      const r = victim ? replaceWithYouth(club, victim, rng) : null;
      if (victim && r) {
        next = r.club;
        playerName = shortName(victim.name);
        youthName = shortName(r.youth.name);
      }
      break;
    }
    case "wantaway": {
      const victim = pickVictim(club, rng);
      if (victim) {
        next = { ...club, wantaway: victim.id };
        playerName = shortName(victim.name);
      }
      break;
    }
    case "flavor":
    default:
      break;
  }

  return {
    club: next,
    news: {
      id: `${matchday}_${club.id}_${tpl.id}_${rng.int(0, 99999)}`,
      matchday,
      clubId: club.id,
      clubName: club.name,
      kind: tpl.id,
      title: tpl.title,
      text: renderText(tpl.text, {
        club: club.name,
        player: playerName,
        youth: youthName,
      }),
    },
  };
}

/**
 * Mercato resolution: any player who handed in a transfer request and was NOT
 * traded leaves (direction Fenerbahce) and is replaced by an academy youth.
 */
export function resolveWantaway(
  club: Club,
  rng: Rng,
  matchday: number
): OffPitchOutcome | null {
  if (!club.wantaway) return null;
  const victim = getPlayer(club.wantaway);
  // Already gone (traded) -> just clear the flag.
  if (!victim || !club.squad.includes(victim.id)) {
    return { club: { ...club, wantaway: undefined }, news: noNews() };
  }
  const r = replaceWithYouth(club, victim, rng);
  // Academie epuisee : le joueur reste, on lui retire juste l'envie de partir.
  if (!r) return { club: { ...club, wantaway: undefined }, news: noNews() };
  return {
    club: { ...r.club, wantaway: undefined },
    news: {
      id: `merc_${matchday}_${club.id}_${rng.int(0, 99999)}`,
      matchday,
      clubId: club.id,
      clubName: club.name,
      kind: "fenerbahce",
      text: `Faute d'accord, ${shortName(victim.name)} signe a Fenerbahce. Le jeune ${shortName(r.youth.name)} (general ${r.youth.overall}) le remplace au pied leve.`,
      title: "Direction la Turquie",
    },
  };
}

const NO_NEWS_ID = "__none__";
function noNews(): NewsItem {
  return {
    id: NO_NEWS_ID,
    matchday: 0,
    clubId: "",
    clubName: "",
    kind: "none",
    title: "",
    text: "",
  };
}
export function isRealNews(n: NewsItem): boolean {
  return n.id !== NO_NEWS_ID && n.text.length > 0;
}
