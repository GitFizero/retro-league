/**
 * Affichage des noms de joueurs en "initiale du prenom + nom" (ex. "Y. Gourcuff").
 * Choix volontaire pour limiter l'exposition au droit a l'image / aux marques :
 * on n'affiche jamais le prenom complet d'un joueur reel. Le nom complet reste
 * utilise en interne (detection des Moments Legendaires, etc.).
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim();
  const [first, ...rest] = parts;
  const initial = first.charAt(0).toUpperCase();
  return `${initial}. ${rest.join(" ")}`;
}
