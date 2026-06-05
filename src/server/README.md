# Code serveur (API multijoueur) — hors build statique

Ces route handlers (`api/leagues`, `api/leagues/[id]/matchday`) implémentent
l'API serveur Supabase (création de ligue, simulation d'une journée côté
serveur — PRD Tome 2 §13-16). Ils sont **volontairement placés hors de
`src/app/`** pour que l'app puisse s'exporter en site statique (`output:
"export"`) et se déployer sans runtime serveur.

Pour activer le multijoueur :

1. Provisionner une instance Supabase (voir `docs/SUPABASE.md`) et renseigner
   `.env.local`.
2. Déplacer ce dossier vers `src/app/api/` (les fichiers sont déjà au bon
   format Next Route Handler).
3. Retirer `output: "export"` de `next.config.mjs` et déployer sur un hôte
   serveur (Vercel, ou Cloudflare via l'adaptateur OpenNext `wrangler deploy`).

Le moteur de jeu (`src/lib/engine`) et la couche d'accès données
(`src/lib/supabase/repository.ts`) sont déjà prêts et réutilisés tels quels.
