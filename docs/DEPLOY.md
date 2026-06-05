# Déploiement

Retro League est une app **Next.js** : le jeu (solo + Mode Défi) tourne dans le
navigateur, mais le projet contient aussi des **routes serveur** (`/api/*`
Supabase). Ce n'est donc **ni un site statique pur, ni un Worker brut** — d'où
l'échec de `npx wrangler deploy` (« Could not detect a directory containing
static files »). Il faut un hébergeur Next.js ou l'adaptateur Cloudflare.

## Option A — Vercel (le plus simple, recommandé par le PRD)

Zéro configuration : Vercel détecte Next.js automatiquement.

1. Importer le repo GitHub sur vercel.com.
2. Ajouter les variables d'env (cf. `.env.example`) si on active Supabase.
3. Deploy. C'est tout.

## Option B — Cloudflare Pages (l'app complète, API comprise)

On utilise l'adaptateur officiel `@cloudflare/next-on-pages` (déjà installé).
Il produit un dossier statique + des Edge Functions pour les routes `/api/*`.
**Validé** : `npm run pages:build` génère bien `.vercel/output/static`.

⚠️ C'est un projet **Pages**, donc la commande de déploiement est
`wrangler pages deploy` — **pas** `wrangler deploy` (qui, lui, vise un Worker
classique et cherche des fichiers statiques → l'erreur que tu as eue).

### Réglages du projet Cloudflare Pages (dashboard)

| Réglage | Valeur |
|---|---|
| Framework preset | Next.js |
| Build command | `npx @cloudflare/next-on-pages@1` |
| Build output directory | `.vercel/output/static` |
| Compatibility flags | `nodejs_compat` |
| Compatibility date | `2024-11-01` (ou plus récent) |

Ces deux derniers points sont aussi fixés dans `wrangler.toml`.

### Déploiement en ligne de commande

```bash
npm run pages:build          # = npx @cloudflare/next-on-pages@1
npx wrangler pages deploy    # lit wrangler.toml (pages_build_output_dir)
# ou en une fois :
npm run pages:deploy
```

### Si tu avais configuré un Worker (commande `wrangler deploy`)

Change le **type de projet** en *Pages*, ou remplace la commande de déploiement
par `npx wrangler pages deploy .vercel/output/static`. `wrangler deploy` (Worker)
ne convient pas à une app Next.js.

### Variables d'environnement (seulement si Supabase activé)

Dans Pages → Settings → Environment variables :
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (cf. `.env.example`). Le jeu solo + Mode Défi
fonctionne **sans** ces variables.

## Option C — Statique seul (jeu uniquement, sans backend)

Le jeu est 100 % client. Si on veut un déploiement purement statique (sans les
routes `/api/*`), il faudrait retirer le dossier `src/app/api` et activer
`output: "export"` dans `next.config.mjs`. Non retenu par défaut pour garder le
backend dans le repo, mais c'est l'option la plus légère si le multijoueur n'est
pas encore branché.
