import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro League — La machine a remonter le temps du football",
  description:
    "Jeu de fantasy football historique. Draft, nostalgie, championnat et moments legendaires. Reconstruisez les equipes de votre adolescence.",
  openGraph: {
    title: "Retro League",
    description:
      "Draft historique, championnat simule et moments legendaires. Reconstruis les equipes de ton adolescence.",
    images: ["/banner.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retro League",
    images: ["/banner.png"],
  },
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
      {/* Umami analytics (respecte la vie privee, sans cookies). */}
      <Script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="7531cdbf-b10b-4631-a86c-511e0f144928"
      />
    </html>
  );
}
