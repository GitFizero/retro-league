import { toBlob } from "html-to-image";

/**
 * Render a DOM node to a PNG and share it. Priorité : copie automatique dans le
 * presse-papier ; repli sur le partage natif (mobile) puis le téléchargement.
 * Returns a short status message for the UI.
 */
export async function shareNodeAsImage(
  node: HTMLElement,
  filename = "retro-league.png"
): Promise<string> {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#F4F0E8",
  });
  if (!blob) return "Echec de la generation de l'image.";

  // 1) Copie automatique dans le presse-papier (demande explicite).
  try {
    if (navigator.clipboard && "write" in navigator.clipboard) {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "Image copiee ! Colle-la ou tu veux (Ctrl/Cmd+V).";
    }
  } catch {
    // clipboard image non supporte -> on tente le partage natif
  }

  // 2) Partage natif avec fichier (mobile).
  try {
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: "Retro League" });
      return "Partage !";
    }
  } catch {
    // annule ou non supporte -> telechargement
  }

  // 3) Repli : telechargement.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "Image telechargee.";
}
