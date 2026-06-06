"use client";

import { motion } from "framer-motion";
import { useGame } from "@/lib/store";
import { BUILD_TAG } from "@/lib/build";

export function Masthead({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b-4 border-double border-ink pb-3 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Retro League"
            className="h-14 sm:h-16 w-auto drop-shadow-sm"
          />
          <div>
            <h1 className="sr-only">Retro League</h1>
            <p className="font-display italic text-ink/70 text-sm">
              {subtitle ?? "La machine a remonter le temps du football"}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-ink/60 font-display uppercase tracking-widest">
          Edition Speciale
          <br />
          Archives du Football
        </div>
      </div>
    </header>
  );
}

export function Shell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto px-4 py-6 sm:py-10"
    >
      <Masthead subtitle={subtitle} />
      {children}
      <footer className="mt-10 pt-3 border-t border-ink/15 text-center text-[10px] text-ink/40 font-display uppercase tracking-widest">
        <div className="flex items-center justify-center gap-4">
          <SupportLink />
          <a
            href={`mailto:gaetan@batemark.com?subject=${encodeURIComponent(
              "[Retro League] Rapport de bug"
            )}&body=${encodeURIComponent(
              `\n\n----------\nDecris le bug ci-dessus.\nVersion : ${BUILD_TAG}`
            )}`}
            className="text-ink/55 hover:text-retro underline decoration-dotted normal-case tracking-normal"
          >
            🐞 Signaler un bug
          </a>
        </div>
        <div className="mt-1.5 normal-case tracking-normal text-ink/45">
          Inspire par et avec nos remerciements a{" "}
          <a
            href="https://www.82-0.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-retro underline decoration-dotted"
          >
            82-0.com
          </a>
        </div>
        <div className="mt-1.5">{BUILD_TAG}</div>
      </footer>
    </motion.main>
  );
}

/** Buy-me-a-coffee support link, reused across the app. */
export function SupportLink({
  variant = "link",
}: {
  variant?: "link" | "button";
}) {
  const href = "https://buymeacoffee.com/retroleague";
  if (variant === "button") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="retro-btn retro-btn-gold text-sm"
      >
        ☕ Soutenir
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink/55 hover:text-retro underline decoration-dotted normal-case tracking-normal"
    >
      ☕ Soutenir
    </a>
  );
}

export function NewLeagueButton({ label = "Quitter" }: { label?: string }) {
  const reset = useGame((s) => s.reset);
  return (
    <button
      type="button"
      className="retro-btn text-xs px-3 py-1.5"
      onClick={() => {
        if (confirm("Abandonner la ligue en cours ?")) reset();
      }}
    >
      {label}
    </button>
  );
}
