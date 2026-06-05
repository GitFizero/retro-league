import type { Config } from "tailwindcss";

/**
 * Direction artistique (PRD Tome 1, section 6).
 * Le joueur voyage dans le temps : papier vieilli, rouge L'Equipe, or Panini.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fond principal : papier vieilli
        paper: "#F4F0E8",
        "paper-dark": "#E7E0D2",
        // Rouge L'Equipe
        retro: "#C4122F",
        "retro-dark": "#9C0E25",
        // Noir d'encre
        ink: "#222222",
        // Or Panini
        gold: "#C9A64D",
        "gold-light": "#E0C684",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 0 rgba(34,34,34,0.18), 0 8px 24px rgba(34,34,34,0.12)",
        "card-lift": "0 4px 0 rgba(34,34,34,0.22), 0 16px 40px rgba(34,34,34,0.2)",
      },
      keyframes: {
        "stamp-in": {
          "0%": { transform: "scale(1.6) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(0.92) rotate(-12deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
      },
      animation: {
        "stamp-in": "stamp-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
