"use client";

import { useGame } from "@/lib/store";

export function Masthead({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b-4 border-double border-ink pb-3 mb-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight text-retro leading-none">
            RETRO LEAGUE
          </h1>
          <p className="font-display italic text-ink/70 text-sm mt-1">
            {subtitle ?? "La machine a remonter le temps du football"}
          </p>
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
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <Masthead subtitle={subtitle} />
      {children}
    </main>
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
