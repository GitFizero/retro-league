# Propriété intellectuelle — posture du projet

> ⚠️ Ce document décrit des choix de conception destinés à limiter l'exposition
> à la propriété intellectuelle de tiers. **Ce n'est pas un avis juridique.**
> Avant toute exploitation commerciale, faites valider par un·e avocat·e
> spécialisé·e (PI / droit du sport / droit à l'image).

## Ce que le projet n'utilise PAS (et n'utilisera pas sans licence)

- ❌ **Aucune photo** de joueur, d'entraîneur ou de stade.
- ❌ **Aucun logo / blason** de club.
- ❌ **Aucun maillot** ni élément graphique d'équipementier.
- ❌ **Aucun nom officiel de club** (marques déposées). Les clubs sont
  désignés par le **nom de la ville** uniquement : « Lyon », « Paris »,
  « Marseille », « Saint-Etienne »… (et non « Olympique Lyonnais », etc.).
- ❌ **Aucune marque de compétition** : on écrit « Championnat de France »
  et non « Ligue 1® » (marque LFP).
- ❌ **Aucune marque tierce** dans le produit : pas de « FIFA® », « FC® »,
  « Panini® », « Sofifa », « L'Équipe® ». Les paliers historiques utilisent
  nos propres identifiants neutres (`MODERNE`, `E2015`, `E2010`, `E2007`,
  `E2003`) affichés comme « Depuis 2010 », « Toute l'histoire », etc.

Le scan `grep -rE 'FIFA|FC26|Sofifa|Panini|Ligue 1' src` ne renvoie aucune
marque tierce.

## Le point sensible : les NOMS de joueurs

Le PRD repose sur la reconnaissance de vrais joueurs (Juninho, Payet, Mbappé…).
Statut juridique nuancé, à connaître :

- Un **nom** en lui-même est un fait, non protégé par le droit d'auteur.
- **Mais** l'usage **commercial** de l'identité d'une personne (nom associé à
  ses données sportives) peut relever du **droit à l'image / droit de la
  personnalité** (en France, art. 9 du Code civil) : chaque joueur peut s'y
  opposer.
- Les éditeurs (EA, Konami) paient pour cela des licences collectives, via
  **FIFPro** notamment, et des licences clubs/ligues.
- Les ratings sont ici des **approximations originales** (pas de base
  tierce extraite), ce qui réduit le risque côté « base de données ».

### Stratégies possibles (à arbitrer par l'éditeur)

1. **Licence** FIFPro (et/ou clubs/ligue) → usage des vrais noms sécurisé.
2. **Noms réels en zone grise** (beaucoup de jeux non officiels le font) →
   risque assumé, décision de l'éditeur.
3. **Mode « noms sûrs »** : noms légèrement altérés (à la PES non licencié) ou
   pseudonymes. Conserve la mécanique, atténue le risque, mais dilue la
   nostalgie.

### Point d'extension technique prévu

Toutes les données « réelles » vivent dans `src/lib/content/`. Pour basculer en
mode « noms sûrs » sans toucher au moteur, il suffira d'introduire une fonction
d'affichage unique `displayName(player)` (et `displayCoach`) pilotée par un flag
`NEXT_PUBLIC_REAL_NAMES`, et d'y brancher une table de pseudonymes. Le reste du
code (moteur, légendes, collections — qui matchent par nom interne) reste
inchangé.

## Coachs

Les entraîneurs sont aussi des personnes réelles : même posture que pour les
joueurs. Le champ `coach` passerait par le même mécanisme `displayName` en mode
« noms sûrs ».
