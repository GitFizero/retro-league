# PRD → Implémentation

Correspondance entre les exigences du PRD (Tomes 1–3) et le code de ce dépôt,
plus le plan de portage du backend vers Supabase pour le multijoueur.

## Décision d'architecture (MVP)

Le PRD vise à terme un jeu **multijoueur temps réel** sur Supabase
(Postgres + Realtime + Auth). Cet environnement ne dispose pas d'instance
Supabase, donc le MVP livré ici :

- implémente **tout le moteur de jeu en TypeScript pur** (`src/lib/engine`),
  sans dépendance React/navigateur, exactement comme il devra tourner côté
  serveur (Tome 2 §15-16 : simulations et validations serveur uniquement) ;
- rend le jeu **immédiatement jouable** en solo contre des clubs IA, avec état
  en `localStorage` via Zustand ;
- isole la **Content Bible** (Tome 3) dans `src/lib/content`, donnée pure et
  réutilisable telle quelle par un futur backend.

Le passage au multijoueur consiste alors à déplacer `store.ts` + `engine` côté
serveur (Edge Functions / RPC Postgres) et à remplacer la persistance locale
par les tables ci-dessous — le moteur, lui, ne change pas.

## Tome 1 — Vision & game design

| Exigence | Implémentation |
|---|---|
| Direction artistique « papier vieilli » (§6), couleurs F4F0E8 / C4122F / 222222 / C9A64D | `tailwind.config.ts`, `src/app/globals.css` |
| Boucle de gameplay (§8) | `src/components/Game.tsx` + écrans `src/components/screens/*` |
| Création de ligue : nom, clubs, mode, profondeur (§9) | `screens/Home.tsx`, `store.createLeague` |
| Draft historique : tirage → 1 joueur → re-tirage (§10) | `engine/draft.ts`, `screens/Draft.tsx` |
| Composition 11+5, formations, malus hors poste (§11) | `engine/positions.ts`, `engine/composition.ts`, `screens/Composition.tsx` |
| Championnat aller-retour, classement Pts/Diff/BP/BC (§12) | `engine/fixtures.ts` |
| Modes rapide / validation (§13) | `store.playMatchday` / `store.simulateRestOfSeason` |
| Mercato mi-saison, échanges uniquement (§14) | `engine/ai.ts`, `screens/Mercato.tsx` |
| Moments Légendaires (§15) | `content/legendary.ts`, `engine/simulation.ts` |
| Narration dynamique (§16) | `content/narration.ts` |
| Clubs IA actifs (§17) | `engine/ai.ts` (draft, compo, échanges, jeu) |
| Hall of Fame (§18) | `screens/HallOfFame.tsx`, `store.topScorers` |
| Récompenses / succès (§19) | `content/collections.ts` |
| Anti-features (§20) | aucune mécanique de salaire/finance/staff n'existe dans le modèle |

## Tome 2 — Architecture & simulation

| Exigence | Implémentation |
|---|---|
| Modèle Sofifa : chaque version de joueur unique (§4) | `content/teams.ts` — id `NOM_CLUB_ANNÉE`, ex. `JUNINHO_OLYMPIQUE_LYONNAIS_2007` |
| Coefficients de poste 100/90/75/50 % (§6) | `engine/positions.ts` → `positionCoefficient` |
| Algorithme : GK 20 / DEF 25 / MID 25 / ATK 30 (§7) | `engine/composition.ts` → `teamRating` |
| Domicile +3 %, forme ±5 %, légende +10 %, aléatoire ±15 % (§7) | `engine/simulation.ts` |
| Génération des buts pondérée par les attaquants (§7) | `simulation.ts` (Poisson + sélection pondérée du buteur) |
| 1000+ lignes narratives, jamais « but minute 84 » (§11) | `content/narration.ts` (templates combinatoires) |
| Simulations serveur, jamais client (§15-16) | moteur pur, sans I/O — voir décision ci-dessus |
| Roadmap MVP (§17) | livré |

### Reproductibilité

Toute la simulation est pilotée par un PRNG seedable (`engine/rng.ts`). Une
rencontre est déterministe pour un seed donné (`(home, away, journée)`), ce qui
rend le moteur testable et permettra une revérification côté serveur.

## Tome 3 — Content Bible

| Exigence | Implémentation |
|---|---|
| Saisons mythiques (Monaco 2017 « MYTHIQUE », Montpellier « MIRACLE »…) | `content/teams.ts` → `mythicTag` |
| Rivalités (Le Classique, Derby du Rhône/Nord/Côte d'Azur) | `content/legendary.ts` → `RIVALRIES` |
| Moments Légendaires par archétype (Payet, Juninho, Hazard, Mbappé…) | `content/legendary.ts` → `LEGENDARY_MOMENTS` |
| Événements narratifs (Le Braquage, Le Retour Impossible, Le Mur, La Climatisation) | `content/narration.ts` + `simulation.ts` |
| Collections cachées (OL Dynasty, Lille Champion, Monaco 2017) | `content/collections.ts` |

## Plan de portage Supabase (V2)

Tables (cf. Tome 2 §3) — le schéma TypeScript de `src/lib/types.ts` en est le
miroir direct :

`users, leagues, clubs, historical_teams, players, squad_players, fixtures,
match_events, legendary_moments, trade_offers`.

Étapes :

1. **Seed** : insérer `HISTORICAL_TEAMS` / `ALL_PLAYERS` / `LEGENDARY_MOMENTS`
   (déjà sous forme de données pures) dans Postgres.
2. **Auth** : Supabase Auth (Google / Discord / Email, Tome 2 §2).
3. **Logique serveur** : exposer `createLeague`, `pickHumanPlayer`,
   `playMatchday`, `proposeTrade` en RPC/Edge Functions appelant **le même
   moteur** `src/lib/engine`. Le client n'envoie que des intentions ; le serveur
   valide (Tome 2 §16).
4. **Temps réel** : `supabase.realtime` sur `fixtures` / `match_events` /
   `trade_offers` pour les notifications (draft terminée, mercato reçu, match
   simulé) (Tome 2 §14).
5. **Draft exclusive (V2)** : retirer les versions déjà draftées du pool global
   au lieu d'autoriser les doublons (Tome 2 §5).
