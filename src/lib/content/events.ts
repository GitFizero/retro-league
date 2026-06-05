/**
 * FAITS DIVERS — l'humour du football francais (touche maison vs 38-0).
 * Evenements PENDANT le match (cartons, bagarre, envahissement) et ENTRE les
 * matchs (DNCG, greve du bus facon Knysna, montre volee au vestiaire, depart
 * a Fenerbahce...). Reference culturelle assumee.
 */

// ---------------------------------------------------------- en match -------

export const YELLOW_CARD_LINES = [
  "{player} laisse trainer la jambe : carton jaune.",
  "Simulation grossiere de {player}, l'arbitre sort le jaune.",
  "{player} proteste un peu trop fort : averti.",
  "Tacle en retard de {player}, carton jaune logique.",
];

export const RED_CARD_LINES = [
  "Tacle assassin de {player} ! Carton rouge, {club} finit a dix.",
  "{player} pete les plombs et voit rouge directement.",
  "Deuxieme jaune pour {player} : douche anticipee.",
  "Coup de coude de {player}, l'arbitre n'hesite pas : rouge.",
];

export const BRAWL_LINES = [
  "Echauffouree generale au milieu du terrain ! Le calme revient peniblement.",
  "Ca pousse, ca s'insulte, les bancs se vident : grosse bagarre !",
  "Nez a nez, front contre front : il faut separer tout le monde.",
];

export const INVASION_LINES = [
  "Un supporter envahit la pelouse et tente un grand pont au gardien.",
  "Fumigenes et envahissement : le match est interrompu quelques minutes.",
  "Un spectateur en slip traverse le terrain, securite aux trousses.",
];

// --------------------------------------------------------- hors match ------

export type OffPitchEffect =
  | { kind: "points"; value: number } // sanction DNCG
  | { kind: "forfeit" } // greve du bus -> forfait au prochain match
  | { kind: "replace" } // joueur ecarte -> remplace par un jeune (~60)
  | { kind: "wantaway" } // joueur reclame son depart
  | { kind: "flavor" }; // pur folklore, aucun effet

export interface OffPitchTemplate {
  id: string;
  weight: number;
  effect: OffPitchEffect;
  /** Placeholders : {club} {player} {youth} {opp}. */
  title: string;
  text: string;
}

export const OFF_PITCH_EVENTS: OffPitchTemplate[] = [
  {
    id: "dncg",
    weight: 6,
    effect: { kind: "points", value: -3 },
    title: "Sanction de la DNCG",
    text: "Comptes dans le rouge : la DNCG inflige a {club} un retrait de 3 points. Le president fait la moue.",
  },
  {
    id: "dncg_severe",
    weight: 2,
    effect: { kind: "points", value: -6 },
    title: "La DNCG frappe fort",
    text: "Gestion catastrophique : {club} ecope de 6 points de penalite. C'est la soupe a la grimace.",
  },
  {
    id: "bus_strike",
    weight: 4,
    effect: { kind: "forfeit" },
    title: "Greve du bus",
    text: "Les joueurs de {club} refusent de descendre du bus pour protester. Le prochain match est compromis.",
  },
  {
    id: "watch_theft",
    weight: 5,
    effect: { kind: "replace" },
    title: "Vol au vestiaire",
    text: "{player} a vole la montre d'un coequipier dans le vestiaire : ecarte par {club}, le jeune {youth} le remplace.",
  },
  {
    id: "training_brawl",
    weight: 5,
    effect: { kind: "replace" },
    title: "Bagarre a l'entrainement",
    text: "Grosse embrouille a l'entrainement : {player} est suspendu par {club} et cede sa place au jeune {youth}.",
  },
  {
    id: "wantaway",
    weight: 6,
    effect: { kind: "wantaway" },
    title: "Coup de chaud au mercato",
    text: "{player} reclame son depart de {club} ! S'il n'est pas echange durant le mercato, il filera ailleurs.",
  },
  {
    id: "nightclub",
    weight: 4,
    effect: { kind: "flavor" },
    title: "Sortie en boite",
    text: "{player} apercu en boite a 4h du matin la veille du match. Le coach 'gere ca en interne'.",
  },
  {
    id: "president_promise",
    weight: 3,
    effect: { kind: "flavor" },
    title: "Promesse presidentielle",
    text: "Le president de {club} promet un recrutement 'a la hauteur de l'ambition'. Les supporters sourient, jaunes.",
  },
  {
    id: "traffic",
    weight: 3,
    effect: { kind: "flavor" },
    title: "Bloque dans les bouchons",
    text: "Deux titulaires de {club} coinces sur le periph : echauffement express a l'arrache.",
  },
  {
    id: "kit_man",
    weight: 2,
    effect: { kind: "flavor" },
    title: "Maillots oublies",
    text: "L'intendant de {club} a oublie les maillots : coup d'envoi retarde, ambiance Sunday League.",
  },
];

export function renderText(
  tpl: string,
  vars: { club?: string; player?: string; youth?: string; opp?: string }
): string {
  return tpl
    .replace(/\{club\}/g, vars.club ?? "le club")
    .replace(/\{player\}/g, vars.player ?? "un joueur")
    .replace(/\{youth\}/g, vars.youth ?? "un jeune")
    .replace(/\{opp\}/g, vars.opp ?? "l'adversaire");
}
