import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro League — La machine a remonter le temps du football",
  description:
    "Jeu de fantasy football historique. Draft, nostalgie, championnat et moments legendaires. Reconstruisez les equipes de votre adolescence.",
};

export const viewport: Viewport = {
  themeColor: "#C4122F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
