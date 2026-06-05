# Backend Supabase — guide de déploiement

Le moteur de jeu (`src/lib/engine`) et la Content Bible (`src/lib/content`) sont
purs et réutilisés tels quels côté serveur. Le backend ajoute la persistance,
l'auth et le temps réel.

> ⚠️ Ce socle est **prêt à déployer mais non testé contre une base live** dans
> cet environnement (pas d'instance Supabase). Le jeu en **solo local**
> fonctionne sans aucune de ces variables.

## Architecture

```
Navigateur ──(lecture RLS / realtime)──► Supabase Postgres
    │
    └──(intentions: créer ligue, jouer journée)──► API Next.js (serveur)
                                                      │  exécute le MOTEUR
                                                      └──(service role)──► Postgres
```

- Les **simulations tournent côté serveur** (Tome 2 §15-16). Le client ne
  simule jamais ; il déclenche puis lit le résultat persté.
- Les clients ne peuvent que **LIRE** leurs ligues (RLS). Toutes les écritures
  de gameplay passent par l'API serveur avec la **service role** (qui contourne
  RLS) — impossible de modifier équipe/score depuis le frontend.

## Fichiers

| Élément | Chemin |
|---|---|
| Schéma + RLS + triggers | `supabase/migrations/0001_init.sql` |
| Seed de contenu (généré) | `supabase/seed.sql` |
| Générateur du seed | `scripts/generate-seed.ts` |
| Types de la base | `src/lib/supabase/database.types.ts` |
| Clients (navigateur / serveur / admin) | `src/lib/supabase/{client,server,admin}.ts` |
| Repository (moteur ↔ base) | `src/lib/supabase/repository.ts` |
| API : ligues | `src/app/api/leagues/route.ts` |
| API : simuler une journée | `src/app/api/leagues/[id]/matchday/route.ts` |

## Étapes

1. **Créer un projet** sur supabase.com (ou `supabase start` en local).
2. **Variables** : copier `.env.example` → `.env.local` et renseigner
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
3. **Migrer** : `supabase db push` (ou coller `0001_init.sql` dans le SQL
   editor).
4. **Seeder le contenu** :
   ```bash
   npx vite-node --config vitest.config.ts scripts/generate-seed.ts
   psql "$DATABASE_URL" -f supabase/seed.sql   # ou via le SQL editor
   ```
   À relancer à chaque évolution de la Content Bible (source de vérité = le TS).
5. **Auth** : activer Google / Discord / Email (Tome 2 §2). Le trigger
   `on_auth_user_created` provisionne automatiquement la ligne `public.users`.
6. **Lancer** : `npm run dev`, puis appeler l'API (authentifié) :
   ```
   POST /api/leagues            { name, clubName, clubCount, simulationMode, historicalDepth }
   GET  /api/leagues            -> ligues de l'utilisateur
   POST /api/leagues/:id/matchday  -> simule la prochaine journée (serveur)
   ```

## Temps réel (Tome 2 §14)

Côté client, s'abonner aux tables pour les notifications (journée simulée,
mercato reçu) :

```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
supabase
  .channel(`league:${leagueId}`)
  .on("postgres_changes",
      { event: "*", schema: "public", table: "fixtures", filter: `league_id=eq.${leagueId}` },
      (payload) => { /* refetch / animer le match */ })
  .subscribe();
```

## Reste à câbler (V2)

- Endpoints de **draft interactif** (`/draft/draw`, `/draft/pick`) remplaçant
  l'auto-draft humain de `createLeagueServer`.
- Endpoints **composition** et **mercato** (mêmes garde-fous : validation
  serveur via le moteur).
- Mode **draft exclusive** (Tome 2 §5) : retirer du pool les versions déjà
  draftées.
- Brancher le store Zustand client sur l'API (au lieu du localStorage) pour le
  mode multijoueur, en gardant le mode solo local en repli.
