"use client";

import { motion } from "framer-motion";
import { useState } from "react";
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
          <BugReportButton />
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
        <div className="mt-1 text-[9px] text-ink/30">{BUILD_TAG}</div>
      </footer>
    </motion.main>
  );
}

/**
 * Bug-report form. Opens a small modal; on submit it composes a prefilled email
 * via mailto. The destination address is never rendered on the page (assembled
 * from a base64 token at click time) so it stays private.
 */
function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");

  const send = () => {
    if (!desc.trim()) return;
    const to = atob("Z2FldGFuQGJhdGVtYXJrLmNvbQ==");
    const body =
      `${desc}\n\n----------\n` +
      (contact ? `Contact : ${contact}\n` : "") +
      `Version : ${BUILD_TAG}`;
    const href = `mailto:${to}?subject=${encodeURIComponent(
      "[Retro League] Rapport de bug"
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setOpen(false);
    setDesc("");
    setContact("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ink/55 hover:text-retro underline decoration-dotted normal-case tracking-normal"
      >
        🐞 Signaler un bug
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="retro-card p-5 w-full max-w-md normal-case tracking-normal text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-1">
              Signaler un bug
            </h3>
            <p className="text-xs text-ink/60 mb-3">
              Decris le souci le plus precisement possible. Merci !
            </p>
            <textarea
              autoFocus
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              placeholder="Que s'est-il passe ? Sur quel ecran ?"
              className="w-full border-2 border-ink rounded-sm bg-paper p-2 text-sm mb-3"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ton email (optionnel, pour te repondre)"
              className="w-full border-2 border-ink rounded-sm bg-paper p-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                className="retro-btn retro-btn-primary text-sm flex-1"
                disabled={!desc.trim()}
                onClick={send}
              >
                Envoyer
              </button>
              <button
                className="retro-btn text-sm"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
