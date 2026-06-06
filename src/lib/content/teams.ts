import type { Era, HistoricalTeam, Player, Position } from "@/lib/types";
import { YOUTH_PLAYERS } from "@/lib/content/youth";
import { FIFA_TEAMS, FIFA_PLAYERS } from "@/lib/content/fifa.generated";
import {
  EUROPEAN_TEAMS,
  EUROPEAN_PLAYERS,
} from "@/lib/content/european.generated";

/**
 * THE CONTENT BIBLE (PRD Tome 3).
 *
 * "Le moteur de simulation n'est pas ce qui fera le succes de Retro League.
 *  La vraie valeur du jeu est ici. Les souvenirs. Les anecdotes."
 *
 * Each entry is a historical club-season with its iconic squad. Ratings are
 * period-accurate approximations. Every player is a distinct version
 * (per-season versioning, Tome 2 section 4): the id encodes club + season.
 *
 * IP NOTE: clubs are referenced by CITY name only (no registered club marks),
 * no crests, no kits, no photos. Player names are factual references; see
 * docs/LEGAL-IP.md for the licensing posture and the name-display toggle.
 */

interface RawPlayer {
  n: string; // name
  p: Position; // main position
  s?: Position[]; // secondary positions
  o: number; // overall
  a: number; // age
  nat: string; // nationality
  pot?: number; // potential override
}

interface RawTeam {
  club: string;
  season: string; // e.g. "2007-08"
  era: Era;
  league: string;
  coach: string;
  finalPosition: number;
  points: number;
  description: string;
  mythicTag?: string;
  players: RawPlayer[];
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function startYear(season: string): number {
  return parseInt(season.slice(0, 4), 10);
}

function expand(raw: RawTeam): { team: HistoricalTeam; players: Player[] } {
  const teamId = `${slug(raw.club)}_${raw.season.slice(0, 4)}`;
  const year = startYear(raw.season);
  const decade = Math.floor(year / 10) * 10;

  const team: HistoricalTeam = {
    id: teamId,
    clubName: raw.club,
    season: raw.season,
    era: raw.era,
    league: raw.league,
    coach: raw.coach,
    finalPosition: raw.finalPosition,
    points: raw.points,
    description: raw.description,
    mythicTag: raw.mythicTag,
  };

  const players: Player[] = raw.players.map((rp) => {
    const pot =
      rp.pot ??
      Math.min(99, rp.o + (rp.a <= 21 ? 6 : rp.a <= 24 ? 3 : 0));
    return {
      id: `${slug(rp.n)}_${teamId}`,
      name: rp.n,
      position: rp.p,
      secondaryPositions: rp.s ?? [],
      overall: rp.o,
      potential: pot,
      age: rp.a,
      nationality: rp.nat,
      decade,
      historicalTeamId: teamId,
      club: raw.club,
      season: raw.season,
      era: raw.era,
    };
  });

  return { team, players };
}

const RAW_TEAMS: RawTeam[] = [
  {
    club: "Lyon",
    season: "2007-08",
    era: "E2007",
    league: "Championnat de France",
    coach: "Alain Perrin",
    finalPosition: 1,
    points: 79,
    description:
      "Septieme titre consecutif. Lyon regne encore sans partage sur le championnat.",
    mythicTag: "DYNASTIE",
    players: [
      { n: "Gregory Coupet", p: "G", o: 86, a: 35, nat: "France" },
      { n: "Anthony Reveillere", p: "DD", s: ["DC"], o: 79, a: 28, nat: "France" },
      { n: "Cris", p: "DC", o: 83, a: 30, nat: "Bresil" },
      { n: "Sebastien Squillaci", p: "DC", o: 79, a: 27, nat: "France" },
      { n: "Fabio Grosso", p: "DG", s: ["MG"], o: 80, a: 30, nat: "Italie" },
      { n: "Jeremy Toulalan", p: "MDC", s: ["DC"], o: 82, a: 24, nat: "France" },
      { n: "Juninho", p: "MOC", s: ["MC"], o: 86, a: 32, nat: "Bresil" },
      { n: "Kim Kallstrom", p: "MC", s: ["MOC"], o: 81, a: 25, nat: "Suede" },
      { n: "Sidney Govou", p: "AD", s: ["BU"], o: 80, a: 28, nat: "France" },
      { n: "Hatem Ben Arfa", p: "AG", s: ["MOC", "AD"], o: 79, a: 20, nat: "France", pot: 88 },
      { n: "Karim Benzema", p: "BU", o: 83, a: 20, nat: "France", pot: 91 },
      { n: "Fred", p: "BU", o: 80, a: 24, nat: "Bresil" },
      { n: "Milan Baros", p: "BU", o: 79, a: 26, nat: "Tchequie" },
      { n: "Jeremy Clerc", p: "DG", o: 75, a: 24, nat: "France" },
    ],
  },
  {
    club: "Bordeaux",
    season: "2008-09",
    era: "E2007",
    league: "Championnat de France",
    coach: "Laurent Blanc",
    finalPosition: 1,
    points: 80,
    description:
      "Bordeaux deroule son football comme au printemps 2009. Champions.",
    mythicTag: "DOMINATION",
    players: [
      { n: "Ulrich Rame", p: "G", o: 80, a: 36, nat: "France" },
      { n: "Mathieu Chalme", p: "DD", o: 75, a: 28, nat: "France" },
      { n: "Marc Planus", p: "DC", o: 78, a: 26, nat: "France" },
      { n: "Michael Ciani", p: "DC", o: 78, a: 24, nat: "France" },
      { n: "Benoit Tremoulinas", p: "DG", o: 75, a: 23, nat: "France" },
      { n: "Alou Diarra", p: "MDC", o: 80, a: 27, nat: "France" },
      { n: "Fernando Menegazzo", p: "MC", o: 76, a: 27, nat: "Bresil" },
      { n: "Yoann Gourcuff", p: "MOC", s: ["MC"], o: 84, a: 22, nat: "France", pot: 89 },
      { n: "Wendel", p: "MG", s: ["MC"], o: 79, a: 26, nat: "Bresil" },
      { n: "Yoan Gouffran", p: "AD", s: ["BU"], o: 76, a: 22, nat: "France" },
      { n: "Marouane Chamakh", p: "BU", o: 80, a: 25, nat: "Maroc" },
      { n: "Fernando Cavenaghi", p: "BU", o: 79, a: 25, nat: "Argentine" },
    ],
  },
  {
    club: "Marseille",
    season: "2009-10",
    era: "E2007",
    league: "Championnat de France",
    coach: "Didier Deschamps",
    finalPosition: 1,
    points: 78,
    description:
      "Champion de France. Meilleur buteur : Mamadou Niang. Le Velodrome revit.",
    players: [
      { n: "Steve Mandanda", p: "G", o: 84, a: 24, nat: "France", pot: 88 },
      { n: "Rod Fanni", p: "DD", o: 77, a: 28, nat: "France" },
      { n: "Souleymane Diawara", p: "DC", o: 79, a: 31, nat: "Senegal" },
      { n: "Gabriel Heinze", p: "DC", s: ["DG"], o: 80, a: 31, nat: "Argentine" },
      { n: "Taye Taiwo", p: "DG", o: 79, a: 24, nat: "Nigeria" },
      { n: "Stephane Mbia", p: "MDC", s: ["DC"], o: 80, a: 23, nat: "Cameroun" },
      { n: "Benoit Cheyrou", p: "MC", o: 77, a: 28, nat: "France" },
      { n: "Lucho Gonzalez", p: "MOC", s: ["MC"], o: 82, a: 28, nat: "Argentine" },
      { n: "Mathieu Valbuena", p: "MG", s: ["MOC", "AD"], o: 80, a: 25, nat: "France" },
      { n: "Andre Ayew", p: "AD", s: ["AG"], o: 76, a: 20, nat: "Ghana", pot: 84 },
      { n: "Mamadou Niang", p: "BU", o: 81, a: 31, nat: "Senegal" },
      { n: "Brandao", p: "BU", o: 77, a: 30, nat: "Bresil" },
    ],
  },
  {
    club: "Marseille",
    season: "2017-18",
    era: "E2015",
    league: "Championnat de France",
    coach: "Rudi Garcia",
    finalPosition: 4,
    points: 77,
    description:
      "Finaliste d'une grande coupe europeenne. Payet et Thauvin font rever le Velodrome.",
    players: [
      { n: "Steve Mandanda", p: "G", o: 84, a: 32, nat: "France" },
      { n: "Hiroki Sakai", p: "DD", o: 78, a: 27, nat: "Japon" },
      { n: "Adil Rami", p: "DC", o: 79, a: 32, nat: "France" },
      { n: "Rolando", p: "DC", o: 77, a: 32, nat: "Portugal" },
      { n: "Jordan Amavi", p: "DG", o: 76, a: 24, nat: "France" },
      { n: "Luiz Gustavo", p: "MDC", s: ["DC"], o: 82, a: 30, nat: "Bresil" },
      { n: "Morgan Sanson", p: "MC", s: ["MOC"], o: 79, a: 23, nat: "France" },
      { n: "Dimitri Payet", p: "MOC", s: ["MG", "AD"], o: 84, a: 30, nat: "France" },
      { n: "Florian Thauvin", p: "AD", s: ["MOC"], o: 83, a: 25, nat: "France" },
      { n: "Clinton Njie", p: "AG", s: ["BU"], o: 76, a: 24, nat: "Cameroun" },
      { n: "Valere Germain", p: "BU", o: 78, a: 27, nat: "France" },
      { n: "Konstantinos Mitroglou", p: "BU", o: 77, a: 30, nat: "Grece" },
      { n: "Bouna Sarr", p: "MD", s: ["DD"], o: 75, a: 25, nat: "Guinee" },
    ],
  },
  {
    club: "Monaco",
    season: "2016-17",
    era: "E2015",
    league: "Championnat de France",
    coach: "Leonardo Jardim",
    finalPosition: 1,
    points: 95,
    description:
      "Monaco joue comme s'il etait encore en route vers les demi-finales europeennes.",
    mythicTag: "SAISON MYTHIQUE",
    players: [
      { n: "Danijel Subasic", p: "G", o: 82, a: 32, nat: "Croatie" },
      { n: "Djibril Sidibe", p: "DD", o: 80, a: 24, nat: "France" },
      { n: "Kamil Glik", p: "DC", o: 82, a: 28, nat: "Pologne" },
      { n: "Jemerson", p: "DC", o: 78, a: 24, nat: "Bresil" },
      { n: "Benjamin Mendy", p: "DG", o: 80, a: 22, nat: "France", pot: 86 },
      { n: "Fabinho", p: "MDC", s: ["DD"], o: 82, a: 23, nat: "Bresil", pot: 87 },
      { n: "Tiemoue Bakayoko", p: "MC", s: ["MDC"], o: 81, a: 22, nat: "France", pot: 86 },
      { n: "Joao Moutinho", p: "MC", s: ["MOC"], o: 82, a: 30, nat: "Portugal" },
      { n: "Bernardo Silva", p: "MOC", s: ["AD"], o: 84, a: 22, nat: "Portugal", pot: 90 },
      { n: "Thomas Lemar", p: "MG", s: ["MOC"], o: 82, a: 21, nat: "France", pot: 88 },
      { n: "Kylian Mbappe", p: "BU", s: ["AG"], o: 83, a: 18, nat: "France", pot: 95 },
      { n: "Radamel Falcao", p: "BU", o: 85, a: 30, nat: "Colombie" },
      { n: "Valere Germain", p: "BU", o: 78, a: 26, nat: "France" },
      { n: "Nabil Dirar", p: "MD", s: ["DD"], o: 77, a: 30, nat: "Maroc" },
    ],
  },
  {
    club: "Lille",
    season: "2010-11",
    era: "E2010",
    league: "Championnat de France",
    coach: "Rudi Garcia",
    finalPosition: 1,
    points: 76,
    description:
      "Le doute n'existe pas. Lille realise le double Coupe-Championnat.",
    mythicTag: "CHAMPION",
    players: [
      { n: "Mickael Landreau", p: "G", o: 82, a: 31, nat: "France" },
      { n: "Mathieu Debuchy", p: "DD", o: 80, a: 25, nat: "France" },
      { n: "Adil Rami", p: "DC", o: 80, a: 24, nat: "France" },
      { n: "Aurelien Chedjou", p: "DC", o: 79, a: 25, nat: "Cameroun" },
      { n: "Franck Beria", p: "DG", o: 75, a: 27, nat: "France" },
      { n: "Rio Mavuba", p: "MDC", o: 79, a: 26, nat: "France" },
      { n: "Yohan Cabaye", p: "MC", s: ["MDC"], o: 82, a: 25, nat: "France" },
      { n: "Florent Balmont", p: "MC", o: 77, a: 30, nat: "France" },
      { n: "Eden Hazard", p: "MG", s: ["MOC", "AG"], o: 84, a: 20, nat: "Belgique", pot: 93 },
      { n: "Gervinho", p: "AD", s: ["BU"], o: 81, a: 23, nat: "Cote d'Ivoire" },
      { n: "Moussa Sow", p: "BU", o: 81, a: 24, nat: "Senegal" },
      { n: "Ludovic Obraniak", p: "MOC", o: 77, a: 26, nat: "Pologne" },
    ],
  },
  {
    club: "Montpellier",
    season: "2011-12",
    era: "E2010",
    league: "Championnat de France",
    coach: "Rene Girard",
    finalPosition: 1,
    points: 82,
    description:
      "Personne ne les attendait la. Encore une fois. Le miracle de la Paillade.",
    mythicTag: "MIRACLE",
    players: [
      { n: "Geoffrey Jourdren", p: "G", o: 76, a: 25, nat: "France" },
      { n: "Garry Bocaly", p: "DD", o: 73, a: 23, nat: "France" },
      { n: "Mapou Yanga-Mbiwa", p: "DC", o: 80, a: 22, nat: "France", pot: 85 },
      { n: "Hilton", p: "DC", o: 79, a: 34, nat: "Bresil" },
      { n: "Abdelhamid El Kaoutari", p: "DG", s: ["DC"], o: 74, a: 21, nat: "Maroc" },
      { n: "Jamel Saihi", p: "MDC", o: 75, a: 24, nat: "Tunisie" },
      { n: "Joris Marveaux", p: "MC", o: 73, a: 26, nat: "France" },
      { n: "Younes Belhanda", p: "MOC", s: ["MC"], o: 80, a: 21, nat: "Maroc", pot: 86 },
      { n: "Remy Cabella", p: "MG", s: ["MOC"], o: 78, a: 21, nat: "France", pot: 84 },
      { n: "Olivier Giroud", p: "BU", o: 82, a: 25, nat: "France" },
      { n: "Souleymane Camara", p: "BU", o: 75, a: 29, nat: "Senegal" },
      { n: "John Utaka", p: "AD", o: 75, a: 30, nat: "Nigeria" },
      { n: "Karim Ait-Fana", p: "AG", o: 73, a: 22, nat: "Maroc" },
    ],
  },
  {
    club: "Paris",
    season: "2015-16",
    era: "E2015",
    league: "Championnat de France",
    coach: "Laurent Blanc",
    finalPosition: 1,
    points: 96,
    description:
      "Une saison de domination absolue. 96 points, un record francais.",
    mythicTag: "DOMINATION",
    players: [
      { n: "Kevin Trapp", p: "G", o: 82, a: 25, nat: "Allemagne" },
      { n: "Serge Aurier", p: "DD", o: 80, a: 22, nat: "Cote d'Ivoire" },
      { n: "Thiago Silva", p: "DC", o: 87, a: 31, nat: "Bresil" },
      { n: "Marquinhos", p: "DC", s: ["MDC"], o: 82, a: 21, nat: "Bresil", pot: 89 },
      { n: "Maxwell", p: "DG", o: 80, a: 34, nat: "Bresil" },
      { n: "Thiago Motta", p: "MDC", o: 83, a: 33, nat: "Italie" },
      { n: "Marco Verratti", p: "MC", o: 85, a: 23, nat: "Italie", pot: 90 },
      { n: "Blaise Matuidi", p: "MC", o: 83, a: 28, nat: "France" },
      { n: "Javier Pastore", p: "MOC", o: 82, a: 26, nat: "Argentine" },
      { n: "Angel Di Maria", p: "AD", s: ["MG"], o: 86, a: 27, nat: "Argentine" },
      { n: "Zlatan Ibrahimovic", p: "BU", o: 90, a: 34, nat: "Suede" },
      { n: "Edinson Cavani", p: "BU", o: 87, a: 28, nat: "Uruguay" },
      { n: "Lucas Moura", p: "AD", s: ["AG"], o: 82, a: 23, nat: "Bresil" },
      { n: "Ezequiel Lavezzi", p: "AG", o: 80, a: 30, nat: "Argentine" },
    ],
  },
  {
    club: "Nice",
    season: "2015-16",
    era: "E2015",
    league: "Championnat de France",
    coach: "Claude Puel",
    finalPosition: 4,
    points: 63,
    description:
      "La saison ou Ben Arfa a decide de jouer seul. Et ca a marche.",
    players: [
      { n: "Mouez Hassen", p: "G", o: 72, a: 20, nat: "Tunisie" },
      { n: "Maxime Le Marchand", p: "DC", s: ["DG"], o: 74, a: 26, nat: "France" },
      { n: "Paul Baysse", p: "DC", o: 74, a: 27, nat: "France" },
      { n: "Romain Genevois", p: "DD", o: 73, a: 28, nat: "Haiti" },
      { n: "Olivier Boscagli", p: "DG", s: ["DC"], o: 71, a: 18, nat: "France", pot: 80 },
      { n: "Nampalys Mendy", p: "MDC", o: 78, a: 23, nat: "France" },
      { n: "Jean Michael Seri", p: "MC", s: ["MOC"], o: 79, a: 24, nat: "Cote d'Ivoire" },
      { n: "Valentin Eysseric", p: "MOC", o: 75, a: 23, nat: "France" },
      { n: "Hatem Ben Arfa", p: "MOC", s: ["AG", "AD"], o: 82, a: 28, nat: "France" },
      { n: "Alassane Plea", p: "BU", o: 76, a: 22, nat: "France", pot: 84 },
      { n: "Mounir Obbadi", p: "MC", o: 74, a: 32, nat: "Maroc" },
      { n: "Said Benrahma", p: "AG", o: 70, a: 20, nat: "Algerie", pot: 82 },
    ],
  },
  {
    club: "Marseille",
    season: "2003-04",
    era: "E2003",
    league: "Championnat de France",
    coach: "Jose Anigo",
    finalPosition: 7,
    points: 56,
    description:
      "La saison de l'eclosion de Drogba. Finale europeenne au bout du reve.",
    players: [
      { n: "Fabien Barthez", p: "G", o: 84, a: 32, nat: "France" },
      { n: "Abdoulaye Meite", p: "DC", o: 76, a: 23, nat: "Cote d'Ivoire" },
      { n: "Daniel Van Buyten", p: "DC", o: 80, a: 26, nat: "Belgique" },
      { n: "Habib Beye", p: "DD", o: 75, a: 26, nat: "Senegal" },
      { n: "Taye Taiwo", p: "DG", o: 72, a: 19, nat: "Nigeria", pot: 80 },
      { n: "Brahim Hemdani", p: "MDC", s: ["DC"], o: 75, a: 26, nat: "Algerie" },
      { n: "Demetrio Albertini", p: "MC", o: 79, a: 32, nat: "Italie" },
      { n: "Camel Meriem", p: "MOC", s: ["MD"], o: 76, a: 24, nat: "France" },
      { n: "Fabrice Fiorese", p: "AG", s: ["AD"], o: 75, a: 30, nat: "France" },
      { n: "Didier Drogba", p: "BU", o: 84, a: 26, nat: "Cote d'Ivoire", pot: 89 },
      { n: "Steve Marlet", p: "BU", s: ["AD"], o: 77, a: 29, nat: "France" },
      { n: "Mido", p: "BU", o: 78, a: 21, nat: "Egypte", pot: 84 },
    ],
  },
  {
    club: "Paris",
    season: "2006-07",
    era: "E2003",
    league: "Championnat de France",
    coach: "Guy Lacombe",
    finalPosition: 15,
    points: 47,
    description:
      "Une occasion suffit a Pauleta. Le Portugais porte un Paris en crise.",
    players: [
      { n: "Mickael Landreau", p: "G", o: 80, a: 27, nat: "France" },
      { n: "Bernard Mendy", p: "DD", o: 73, a: 25, nat: "France" },
      { n: "Mario Yepes", p: "DC", o: 79, a: 30, nat: "Colombie" },
      { n: "Sammy Traore", p: "DC", o: 74, a: 25, nat: "Mali" },
      { n: "Sylvain Armand", p: "DG", o: 76, a: 26, nat: "France" },
      { n: "Cristian", p: "MDC", o: 73, a: 23, nat: "Bresil" },
      { n: "Modeste M'Bami", p: "MC", o: 75, a: 24, nat: "Cameroun" },
      { n: "Vikash Dhorasoo", p: "MOC", o: 75, a: 33, nat: "France" },
      { n: "Jerome Rothen", p: "MG", s: ["DG"], o: 79, a: 28, nat: "France" },
      { n: "Pauleta", p: "BU", o: 82, a: 33, nat: "Portugal" },
      { n: "Peguy Luyindula", p: "BU", o: 76, a: 27, nat: "France" },
      { n: "Edouard Cisse", p: "MDC", o: 74, a: 28, nat: "France" },
    ],
  },
  {
    club: "Saint-Etienne",
    season: "2012-13",
    era: "E2010",
    league: "Championnat de France",
    coach: "Christophe Galtier",
    finalPosition: 5,
    points: 63,
    description:
      "Saint-Etienne souleve une coupe nationale. Le Chaudron gronde a nouveau.",
    players: [
      { n: "Stephane Ruffier", p: "G", o: 82, a: 26, nat: "France" },
      { n: "Francois Clerc", p: "DD", o: 75, a: 29, nat: "France" },
      { n: "Loic Perrin", p: "DC", s: ["MDC"], o: 79, a: 27, nat: "France" },
      { n: "Bakary Kone", p: "DC", o: 75, a: 24, nat: "Burkina Faso" },
      { n: "Faouzi Ghoulam", p: "DG", o: 77, a: 21, nat: "Algerie", pot: 84 },
      { n: "Jeremy Clement", p: "MDC", o: 76, a: 28, nat: "France" },
      { n: "Josuha Guilavogui", p: "MC", o: 77, a: 22, nat: "France", pot: 83 },
      { n: "Renaud Cohade", p: "MOC", o: 74, a: 28, nat: "France" },
      { n: "Romain Hamouma", p: "AD", s: ["AG"], o: 76, a: 25, nat: "France" },
      { n: "Max-Alain Gradel", p: "AG", s: ["AD"], o: 77, a: 25, nat: "Cote d'Ivoire" },
      { n: "Pierre-Emerick Aubameyang", p: "BU", s: ["AD"], o: 80, a: 23, nat: "Gabon", pot: 88 },
      { n: "Brandao", p: "BU", o: 76, a: 33, nat: "Bresil" },
    ],
  },
  {
    club: "Lens",
    season: "2006-07",
    era: "E2003",
    league: "Championnat de France",
    coach: "Francis Gillot",
    finalPosition: 5,
    points: 57,
    description:
      "Bollaert pousse. Les Sang et Or accrochent l'Europe au courage.",
    players: [
      { n: "Charles Itandje", p: "G", o: 76, a: 24, nat: "France" },
      { n: "Nicolas Gillet", p: "DD", o: 73, a: 30, nat: "France" },
      { n: "Vitorino Hilton", p: "DC", o: 78, a: 29, nat: "Bresil" },
      { n: "Adama Coulibaly", p: "DC", o: 74, a: 26, nat: "Mali" },
      { n: "Yohan Demont", p: "DG", o: 73, a: 28, nat: "France" },
      { n: "Seydou Keita", p: "MC", s: ["MDC"], o: 80, a: 27, nat: "Mali" },
      { n: "Eric Carriere", p: "MOC", o: 76, a: 33, nat: "France" },
      { n: "Geoffrey Dernis", p: "MG", o: 73, a: 26, nat: "France" },
      { n: "Olivier Monterrubio", p: "MD", o: 75, a: 30, nat: "France" },
      { n: "Aruna Dindane", p: "BU", o: 78, a: 26, nat: "Cote d'Ivoire" },
      { n: "Daniel Cousin", p: "BU", o: 76, a: 29, nat: "Gabon" },
      { n: "Kevin Mirallas", p: "AD", s: ["BU"], o: 73, a: 19, nat: "Belgique", pot: 84 },
    ],
  },
  {
    club: "Lyon",
    season: "2006-07",
    era: "E2003",
    league: "Championnat de France",
    coach: "Gerard Houllier",
    finalPosition: 1,
    points: 81,
    description:
      "Sixieme titre d'affilee. Le Lyon galactique de Juninho, Malouda et un certain Benzema.",
    mythicTag: "DYNASTIE",
    players: [
      { n: "Gregory Coupet", p: "G", o: 86, a: 34, nat: "France" },
      { n: "Anthony Reveillere", p: "DD", s: ["DC"], o: 78, a: 27, nat: "France" },
      { n: "Cris", p: "DC", o: 82, a: 29, nat: "Bresil" },
      { n: "Sebastien Squillaci", p: "DC", o: 78, a: 26, nat: "France" },
      { n: "Eric Abidal", p: "DG", s: ["DC"], o: 82, a: 27, nat: "France" },
      { n: "Jeremy Toulalan", p: "MDC", s: ["DC"], o: 80, a: 23, nat: "France" },
      { n: "Tiago", p: "MC", s: ["MDC"], o: 81, a: 25, nat: "Portugal" },
      { n: "Juninho", p: "MOC", s: ["MC"], o: 86, a: 31, nat: "Bresil" },
      { n: "Florent Malouda", p: "MG", s: ["AG"], o: 83, a: 26, nat: "France" },
      { n: "Sidney Govou", p: "AD", s: ["BU"], o: 80, a: 27, nat: "France" },
      { n: "Fred", p: "BU", o: 81, a: 23, nat: "Bresil" },
      { n: "Karim Benzema", p: "BU", o: 78, a: 19, nat: "France", pot: 91 },
      { n: "Sylvain Wiltord", p: "BU", s: ["AD"], o: 79, a: 32, nat: "France" },
      { n: "Kim Kallstrom", p: "MC", s: ["MG"], o: 80, a: 24, nat: "Suede" },
    ],
  },
  {
    club: "Monaco",
    season: "2003-04",
    era: "E2003",
    league: "Championnat de France",
    coach: "Didier Deschamps",
    finalPosition: 3,
    points: 75,
    description:
      "L'epopee europeenne : Monaco terrasse les geants du continent et atteint la finale europeenne supreme.",
    mythicTag: "EPOPEE EUROPEENNE",
    players: [
      { n: "Flavio Roma", p: "G", o: 80, a: 29, nat: "Italie" },
      { n: "Hugo Ibarra", p: "DD", o: 76, a: 29, nat: "Argentine" },
      { n: "Sebastien Squillaci", p: "DC", o: 77, a: 23, nat: "France" },
      { n: "Gael Givet", p: "DC", s: ["DG"], o: 78, a: 22, nat: "France" },
      { n: "Patrice Evra", p: "DG", s: ["MG"], o: 79, a: 22, nat: "France", pot: 86 },
      { n: "Akis Zikos", p: "MDC", o: 75, a: 29, nat: "Grece" },
      { n: "Lucas Bernardi", p: "MC", o: 78, a: 26, nat: "Argentine" },
      { n: "Jerome Rothen", p: "MG", s: ["DG"], o: 81, a: 25, nat: "France" },
      { n: "Ludovic Giuly", p: "AD", s: ["MOC"], o: 83, a: 27, nat: "France" },
      { n: "Fernando Morientes", p: "BU", o: 84, a: 27, nat: "Espagne" },
      { n: "Dado Prso", p: "BU", o: 79, a: 29, nat: "Croatie" },
      { n: "Jaroslav Plasil", p: "MC", s: ["MG"], o: 74, a: 21, nat: "Tchequie", pot: 82 },
      { n: "Edouard Cisse", p: "MDC", o: 75, a: 25, nat: "France" },
    ],
  },
  {
    club: "Paris",
    season: "2002-03",
    era: "E2003",
    league: "Championnat de France",
    coach: "Luis Fernandez",
    finalPosition: 11,
    points: 47,
    description:
      "La magie d'un sorcier bresilien au Parc. Avant Barcelone, Ronaldinho enflammait Paris.",
    mythicTag: "MAGIE",
    players: [
      { n: "Lionel Letizi", p: "G", o: 80, a: 29, nat: "France" },
      { n: "Bernard Mendy", p: "DD", o: 73, a: 21, nat: "France" },
      { n: "Mauricio Pochettino", p: "DC", o: 80, a: 30, nat: "Argentine" },
      { n: "Frederic Dehu", p: "DC", s: ["MDC"], o: 79, a: 30, nat: "France" },
      { n: "Gabriel Heinze", p: "DG", s: ["DC"], o: 78, a: 24, nat: "Argentine" },
      { n: "Lorik Cana", p: "MDC", o: 72, a: 19, nat: "Albanie", pot: 81 },
      { n: "Modeste M'Bami", p: "MC", o: 75, a: 20, nat: "Cameroun", pot: 82 },
      { n: "Jerome Leroy", p: "MOC", o: 76, a: 28, nat: "France" },
      { n: "Ronaldinho", p: "MOC", s: ["AD", "AG"], o: 87, a: 22, nat: "Bresil", pot: 94 },
      { n: "Fabrice Fiorese", p: "AG", s: ["AD"], o: 76, a: 28, nat: "France" },
      { n: "Aloisio", p: "BU", o: 74, a: 27, nat: "Bresil" },
      { n: "Martin Cardetti", p: "BU", o: 73, a: 28, nat: "Argentine" },
    ],
  },
  {
    club: "Sochaux",
    season: "2003-04",
    era: "E2003",
    league: "Championnat de France",
    coach: "Guy Lacombe",
    finalPosition: 5,
    points: 60,
    description:
      "Sochaux souleve une coupe nationale. Le beau jeu made in Franche-Comte.",
    players: [
      { n: "Teddy Richert", p: "G", o: 76, a: 29, nat: "France" },
      { n: "Rabiu Afolabi", p: "DC", o: 74, a: 24, nat: "Nigeria" },
      { n: "Sylvain Monsoreau", p: "DC", o: 74, a: 22, nat: "France" },
      { n: "Philippe Raschke", p: "DD", o: 72, a: 28, nat: "France" },
      { n: "Jeremy Mathieu", p: "DG", s: ["MG"], o: 74, a: 20, nat: "France", pot: 84 },
      { n: "Benoit Pedretti", p: "MDC", s: ["MC"], o: 80, a: 23, nat: "France" },
      { n: "Wilson Oruma", p: "MC", o: 75, a: 27, nat: "Nigeria" },
      { n: "Mickael Isabey", p: "MG", o: 73, a: 30, nat: "France" },
      { n: "Jaouad Zairi", p: "AD", s: ["AG"], o: 74, a: 21, nat: "Maroc" },
      { n: "Pierre-Alain Frau", p: "BU", o: 79, a: 23, nat: "France" },
      { n: "Francileudo Santos", p: "BU", o: 78, a: 24, nat: "Tunisie" },
      { n: "Camel Meriem", p: "MOC", o: 75, a: 24, nat: "France" },
    ],
  },
  {
    club: "Lyon",
    season: "2010-11",
    era: "E2010",
    league: "Championnat de France",
    coach: "Claude Puel",
    finalPosition: 3,
    points: 64,
    description:
      "Lloris dans les buts, Gourcuff a la baguette, Lisandro a la finition. Une fin de regne en beaute.",
    players: [
      { n: "Hugo Lloris", p: "G", o: 84, a: 23, nat: "France", pot: 90 },
      { n: "Anthony Reveillere", p: "DD", o: 78, a: 31, nat: "France" },
      { n: "Cris", p: "DC", o: 80, a: 33, nat: "Bresil" },
      { n: "Dejan Lovren", p: "DC", o: 78, a: 21, nat: "Croatie", pot: 85 },
      { n: "Aly Cissokho", p: "DG", o: 77, a: 23, nat: "France" },
      { n: "Jeremy Toulalan", p: "MDC", s: ["DC"], o: 82, a: 27, nat: "France" },
      { n: "Miralem Pjanic", p: "MOC", s: ["MC"], o: 80, a: 20, nat: "Bosnie", pot: 88 },
      { n: "Yoann Gourcuff", p: "MOC", s: ["MC"], o: 82, a: 24, nat: "France" },
      { n: "Michel Bastos", p: "MG", s: ["AG", "DG"], o: 80, a: 27, nat: "Bresil" },
      { n: "Lisandro Lopez", p: "BU", o: 83, a: 27, nat: "Argentine" },
      { n: "Bafetimbi Gomis", p: "BU", o: 79, a: 25, nat: "France" },
      { n: "Alexandre Lacazette", p: "AD", s: ["BU"], o: 71, a: 19, nat: "France", pot: 86 },
      { n: "Jimmy Briand", p: "BU", s: ["AD"], o: 76, a: 25, nat: "France" },
      { n: "Kim Kallstrom", p: "MC", o: 79, a: 28, nat: "Suede" },
    ],
  },
  {
    club: "Paris",
    season: "2010-11",
    era: "E2007",
    league: "Championnat de France",
    coach: "Antoine Kombouare",
    finalPosition: 4,
    points: 60,
    description:
      "Le dernier Paris d'avant le Qatar. Nene regale, Hoarau plante, le jeune Sakho commande.",
    mythicTag: "PRE-QATAR",
    players: [
      { n: "Gregory Coupet", p: "G", o: 80, a: 38, nat: "France" },
      { n: "Ceara", p: "DD", o: 74, a: 30, nat: "Bresil" },
      { n: "Mamadou Sakho", p: "DC", o: 79, a: 20, nat: "France", pot: 86 },
      { n: "Zoumana Camara", p: "DC", o: 76, a: 31, nat: "France" },
      { n: "Sylvain Armand", p: "DG", o: 77, a: 30, nat: "France" },
      { n: "Claude Makelele", p: "MDC", o: 80, a: 37, nat: "France" },
      { n: "Clement Chantome", p: "MC", o: 74, a: 23, nat: "France" },
      { n: "Mathieu Bodmer", p: "MC", s: ["DC"], o: 76, a: 28, nat: "France" },
      { n: "Ludovic Giuly", p: "AD", s: ["MOC"], o: 79, a: 34, nat: "France" },
      { n: "Nene", p: "MOC", s: ["AG"], o: 82, a: 29, nat: "Bresil" },
      { n: "Guillaume Hoarau", p: "BU", o: 79, a: 26, nat: "France" },
      { n: "Mevlut Erdinc", p: "BU", o: 77, a: 23, nat: "Turquie" },
      { n: "Peguy Luyindula", p: "BU", o: 75, a: 31, nat: "France" },
    ],
  },
  {
    club: "Saint-Etienne",
    season: "2008-09",
    era: "E2007",
    league: "Championnat de France",
    coach: "Alain Perrin",
    finalPosition: 17,
    points: 41,
    description:
      "Saison galere dans le Chaudron, mais quelle pepiniere : un certain Payet, un certain Matuidi.",
    players: [
      { n: "Jeremie Janot", p: "G", o: 76, a: 31, nat: "France" },
      { n: "Cedric Varrault", p: "DD", o: 72, a: 29, nat: "France" },
      { n: "Sylvain Marchal", p: "DC", o: 74, a: 28, nat: "France" },
      { n: "Efstathios Tavlaridis", p: "DC", o: 74, a: 28, nat: "Grece" },
      { n: "Pascal Feindouno", p: "MD", s: ["AD", "MOC"], o: 77, a: 27, nat: "Guinee" },
      { n: "Blaise Matuidi", p: "MC", s: ["MDC"], o: 77, a: 21, nat: "France", pot: 86 },
      { n: "Gelson Fernandes", p: "MDC", o: 74, a: 22, nat: "Suisse" },
      { n: "Dimitri Payet", p: "MG", s: ["MOC", "AD"], o: 78, a: 21, nat: "France", pot: 86 },
      { n: "Florent Sinama-Pongolle", p: "AD", s: ["BU"], o: 76, a: 24, nat: "France" },
      { n: "Bafetimbi Gomis", p: "BU", o: 78, a: 23, nat: "France", pot: 84 },
      { n: "Ilan", p: "BU", o: 76, a: 28, nat: "Bresil" },
      { n: "Geoffrey Dernis", p: "MG", o: 73, a: 28, nat: "France" },
    ],
  },
  {
    club: "Marseille",
    season: "2011-12",
    era: "E2010",
    league: "Championnat de France",
    coach: "Didier Deschamps",
    finalPosition: 10,
    points: 52,
    description:
      "Le Velodrome vibre pour Valbuena et Gignac. Une saison en dents de scie mais tellement Marseille.",
    players: [
      { n: "Steve Mandanda", p: "G", o: 84, a: 26, nat: "France" },
      { n: "Cesar Azpilicueta", p: "DD", s: ["DG"], o: 78, a: 22, nat: "Espagne", pot: 86 },
      { n: "Nicolas N'Koulou", p: "DC", o: 78, a: 21, nat: "Cameroun", pot: 84 },
      { n: "Souleymane Diawara", p: "DC", o: 78, a: 33, nat: "Senegal" },
      { n: "Taye Taiwo", p: "DG", o: 77, a: 26, nat: "Nigeria" },
      { n: "Stephane Mbia", p: "MDC", s: ["DC"], o: 80, a: 25, nat: "Cameroun" },
      { n: "Alou Diarra", p: "MDC", o: 79, a: 30, nat: "France" },
      { n: "Mathieu Valbuena", p: "MOC", s: ["MG", "AD"], o: 81, a: 27, nat: "France" },
      { n: "Morgan Amalfitano", p: "MD", s: ["AD"], o: 76, a: 26, nat: "France" },
      { n: "Andre Ayew", p: "AG", s: ["AD", "BU"], o: 80, a: 22, nat: "Ghana", pot: 85 },
      { n: "Andre-Pierre Gignac", p: "BU", o: 80, a: 26, nat: "France" },
      { n: "Loic Remy", p: "BU", s: ["AD"], o: 80, a: 24, nat: "France" },
    ],
  },
  {
    club: "Paris",
    season: "2012-13",
    era: "E2010",
    league: "Championnat de France",
    coach: "Carlo Ancelotti",
    finalPosition: 1,
    points: 83,
    description:
      "An I de l'ere Qatar : Zlatan debarque, regne, et offre le titre a Paris.",
    mythicTag: "NOUVELLE ERE",
    players: [
      { n: "Salvatore Sirigu", p: "G", o: 82, a: 25, nat: "Italie" },
      { n: "Christophe Jallet", p: "DD", o: 78, a: 28, nat: "France" },
      { n: "Thiago Silva", p: "DC", o: 88, a: 28, nat: "Bresil" },
      { n: "Alex", p: "DC", o: 82, a: 30, nat: "Bresil" },
      { n: "Maxwell", p: "DG", o: 81, a: 31, nat: "Bresil" },
      { n: "Thiago Motta", p: "MDC", o: 83, a: 30, nat: "Italie" },
      { n: "Marco Verratti", p: "MC", o: 80, a: 20, nat: "Italie", pot: 90 },
      { n: "Blaise Matuidi", p: "MC", o: 82, a: 25, nat: "France" },
      { n: "Javier Pastore", p: "MOC", s: ["AG"], o: 83, a: 23, nat: "Argentine" },
      { n: "Jeremy Menez", p: "AD", s: ["MOC"], o: 81, a: 25, nat: "France" },
      { n: "Zlatan Ibrahimovic", p: "BU", o: 90, a: 31, nat: "Suede" },
      { n: "Ezequiel Lavezzi", p: "AG", s: ["AD"], o: 82, a: 27, nat: "Argentine" },
      { n: "Kevin Gameiro", p: "BU", o: 78, a: 25, nat: "France" },
      { n: "Lucas Moura", p: "AD", s: ["AG"], o: 79, a: 20, nat: "Bresil", pot: 88 },
    ],
  },
  {
    club: "Bordeaux",
    season: "2009-10",
    era: "E2007",
    league: "Championnat de France",
    coach: "Laurent Blanc",
    finalPosition: 6,
    points: 64,
    description:
      "Parcours europeen marquant jusqu'en quart. Gourcuff 2009 au sommet de son art.",
    players: [
      { n: "Cedric Carrasso", p: "G", o: 81, a: 28, nat: "France" },
      { n: "Mathieu Chalme", p: "DD", o: 75, a: 29, nat: "France" },
      { n: "Marc Planus", p: "DC", o: 78, a: 27, nat: "France" },
      { n: "Michael Ciani", p: "DC", o: 78, a: 25, nat: "France" },
      { n: "Benoit Tremoulinas", p: "DG", o: 76, a: 24, nat: "France" },
      { n: "Alou Diarra", p: "MDC", o: 80, a: 28, nat: "France" },
      { n: "Jaroslav Plasil", p: "MC", s: ["MG"], o: 78, a: 27, nat: "Tchequie" },
      { n: "Yoann Gourcuff", p: "MOC", s: ["MC"], o: 85, a: 23, nat: "France", pot: 89 },
      { n: "Wendel", p: "MG", s: ["MC"], o: 79, a: 27, nat: "Bresil" },
      { n: "Marouane Chamakh", p: "BU", o: 81, a: 26, nat: "Maroc" },
      { n: "Fernando Cavenaghi", p: "BU", o: 79, a: 26, nat: "Argentine" },
      { n: "Yoan Gouffran", p: "AD", s: ["BU"], o: 77, a: 23, nat: "France" },
    ],
  },
];

const EXPANDED = RAW_TEAMS.map(expand);

// Les datasets fournissent des tables completes : FIFA pour 2014-15+, European
// Soccer Database (Kaggle) pour 2008-09 a 2013-14. Les squads iconiques faits
// main ne sont conserves que pour les saisons NON couvertes par un dataset.
const DATASET_SEASONS = new Set<string>([
  ...FIFA_TEAMS.map((t) => t.season),
  ...EUROPEAN_TEAMS.map((t) => t.season),
]);

export const HISTORICAL_TEAMS: HistoricalTeam[] = [
  ...EXPANDED.map((e) => e.team).filter((t) => !DATASET_SEASONS.has(t.season)),
  ...EUROPEAN_TEAMS,
  ...FIFA_TEAMS,
];
/** Draftable historical players (does NOT include academy youths). */
export const ALL_PLAYERS: Player[] = [
  ...EXPANDED.flatMap((e) => e.players).filter(
    (p) => !DATASET_SEASONS.has(p.season)
  ),
  ...EUROPEAN_PLAYERS,
  ...FIFA_PLAYERS,
];

// Youths are resolvable via getPlayer (for replacements) but never drafted.
export const PLAYERS_BY_ID = new Map<string, Player>(
  [...ALL_PLAYERS, ...YOUTH_PLAYERS].map((p) => [p.id, p])
);
export const TEAMS_BY_ID = new Map<string, HistoricalTeam>(
  HISTORICAL_TEAMS.map((t) => [t.id, t])
);

export function getPlayer(id: string): Player | undefined {
  return PLAYERS_BY_ID.get(id);
}

export function playersOfTeam(teamId: string): Player[] {
  return ALL_PLAYERS.filter((p) => p.historicalTeamId === teamId);
}
