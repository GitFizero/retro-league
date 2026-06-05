# Retro League ⚽📼

> La machine à remonter le temps du football.
>
> **Draft + Nostalgie + Championnat + Moments Légendaires.**

Retro League est un jeu de fantasy football *historique* : on reconstruit
l'équipe de rêve impossible de son adolescence (Juninho 2007, Mbappé Monaco
2017, Drogba 2004, Payet, Gourcuff, Pauleta…), on l'aligne, et on la regarde
écrire son histoire dans un championnat simulé, raconté ligne par ligne.

Ce dépôt implémente le **cœur jouable** décrit dans le PRD (Tomes 1 à 3) : un
MVP web Next.js entièrement jouable en solo contre des clubs IA, avec un moteur
de jeu pur, testé et déterministe.

---

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000
```

Autres scripts :

```bash
npm run build      # build de production
npm run test       # suite de tests du moteur (Vitest)
npm run typecheck  # vérification TypeScript stricte
```

## La boucle de jeu

`Accueil → Création de ligue → Draft → Composition → Championnat → Mercato →
Hall of Fame` (PRD Tome 1, section 8). Tout se déroule dans le navigateur ; la
partie est sauvegardée en `localStorage`.

1. **Créer une ligue** — nom, nombre de clubs (2 à 18), profondeur historique
   (FC26 → FIFA07) et mode de simulation (rapide / validation).
2. **Draft historique** — le système tire une équipe au hasard ; vous ne
   choisissez **qu'un** joueur, puis un nouveau tirage apparaît. *« Les
   contraintes créent les souvenirs. »*
3. **Composition** — 11 titulaires + 5 remplaçants, 5 formations, malus
   « hors poste » calculé par coefficient.
4. **Championnat** — matchs aller-retour, classement, narration vivante,
   **Moments Légendaires**.
5. **Mercato** — mi-saison, uniquement des échanges, les deux clubs doivent
   accepter.
6. **Hall of Fame** — champion, meilleurs buteurs, records, collections et
   succès débloqués.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** strict
- **Tailwind CSS** (direction artistique « papier vieilli » du PRD) · **Framer Motion**
- **Zustand** (état de jeu + persistance locale)
- **Vitest** (32 tests sur le moteur)

## Architecture du code

```
src/
├─ app/                     # Next.js App Router (layout, page, styles globaux)
├─ components/              # UI rétro + écrans (Home, Draft, Composition, …)
│  └─ screens/
├─ lib/
│  ├─ types.ts             # modèle de domaine (cf. data model Tome 2)
│  ├─ store.ts             # orchestration de la boucle de jeu (Zustand)
│  ├─ content/             # LA CONTENT BIBLE (Tome 3) — la vraie valeur
│  │  ├─ teams.ts          # équipes & effectifs historiques (Modèle Sofifa)
│  │  ├─ legendary.ts      # Moments Légendaires + rivalités
│  │  ├─ narration.ts      # moteur narratif + événements (Le Braquage…)
│  │  └─ collections.ts    # collections cachées & succès
│  └─ engine/              # moteur pur, testé, déterministe (serveur-ready)
│     ├─ rng.ts            # PRNG seedable (simulations reproductibles)
│     ├─ positions.ts      # géométrie des postes + coefficients
│     ├─ draft.ts          # tirage & draft IA
│     ├─ composition.ts    # XI optimal, force par ligne, note d'équipe
│     ├─ fixtures.ts       # calendrier aller-retour + classement
│     ├─ simulation.ts     # algorithme de match + buts + légendes
│     └─ ai.ts             # personnalités, formations, échanges IA
```

Le moteur (`src/lib/engine`) ne dépend ni de React ni du navigateur : il est
écrit pour pouvoir tourner **côté serveur** (PRD Tome 2, section 15 — « Jamais
côté client »). Voir [`docs/PRD-MAPPING.md`](docs/PRD-MAPPING.md) pour la
correspondance détaillée PRD ↔ code et le plan de portage vers Supabase.

## Backend multijoueur (Supabase)

Le jeu solo tourne sans backend. Un socle Supabase **prêt à déployer** est
fourni : schéma + RLS (`supabase/migrations`), seed de contenu généré depuis la
Content Bible (`npm run seed:gen`), clients typés et **API serveur qui exécute
le moteur** (les simulations ne tournent jamais côté client). Voir
[`docs/SUPABASE.md`](docs/SUPABASE.md).

## Propriété intellectuelle

Aucune photo, aucun logo, aucun maillot. Clubs désignés par le nom de **ville**,
pas de marques tierces (ni « Ligue 1 », ni « FIFA », etc.). La posture et le
point d'extension « noms sûrs » sont documentés dans
[`docs/LEGAL-IP.md`](docs/LEGAL-IP.md).

## Statut

MVP jouable conforme à la roadmap MVP du Tome 2 (compte/ligue local, draft,
composition, simulation, classement, IA, mercato, moments légendaires) + socle
backend Supabase. Les phases V2/V3 (draft interactif serveur, draft exclusive,
ligues européennes) sont décrites dans `docs/PRD-MAPPING.md` et
`docs/SUPABASE.md`.
