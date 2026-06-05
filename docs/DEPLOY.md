# Déploiement

Retro League est exporté en **site statique** (`output: "export"` → dossier
`out/`). Le jeu (solo, Mode Défi, ligues, faits divers) tourne 100 % dans le
navigateur, donc **aucun runtime serveur n'est requis**. Ça se déploie partout :
Cloudflare, GitHub Pages, Vercel, n'importe quel CDN.

```bash
npm run build      # genere out/
```

## Cloudflare (avec ta commande actuelle `wrangler deploy`)

Grâce aux **Workers static assets**, `wrangler deploy` sert directement `out/`
(c'est ce qui réglait l'erreur « Could not detect a directory containing static
files » : il manquait le dossier statique + la config `[assets]`, désormais dans
`wrangler.toml`).

Réglages du projet Cloudflare :

| Réglage | Valeur |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| (rien d'autre) | `wrangler.toml` pointe `[assets] directory = "./out"` |

En local : `npm run deploy` (= `next build && wrangler deploy`).

> Si tu utilises plutôt **Cloudflare Pages** (intégration Git) : Build command
> `npm run build`, Build output directory `out`. Pas besoin de `wrangler`.

## GitHub Pages

Build `npm run build`, publie le dossier `out/` (ex. action
`actions/upload-pages-artifact` sur `out`). Site 100 % statique.

## Vercel

Import du repo → détection Next.js automatique. (Vercel sert aussi très bien
l'export statique.)

## Backend Supabase (multijoueur, plus tard)

Les routes serveur de l'API multijoueur ont été déplacées hors du build statique
dans `src/server/api/` (voir `src/server/README.md`) : elles sont conservées
comme référence mais ne sont pas déployées tant qu'on n'a pas branché une vraie
instance Supabase + un hôte serveur. Le schéma, le seed et les clients restent
dans `supabase/` et `src/lib/supabase/`. Pour activer le multijoueur, on
redéploiera sur un hôte serveur (Vercel, ou Cloudflare via l'adaptateur OpenNext)
en réintégrant ces routes sous `src/app/api/`.
