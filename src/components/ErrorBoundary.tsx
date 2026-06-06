"use client";

import React from "react";

interface State {
  error: Error | null;
}

/**
 * Catches any render error so the app never white-screens with the opaque
 * "Application error: a client-side exception has occurred". Shows the real
 * message and a one-click recovery that clears the local save (the usual
 * culprit being a stale persisted state after an update).
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface it in the console for debugging.
    console.error("Retro League render error:", error);
  }

  private reset = () => {
    try {
      localStorage.removeItem("retro-league-save");
      localStorage.removeItem("retro-league-challenge");
    } catch {
      // ignore
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="retro-card p-6 max-w-md space-y-4">
          <h1 className="font-display text-2xl font-bold text-retro">
            Oups, un grain de sable
          </h1>
          <p className="text-sm text-ink/80">
            Une erreur est survenue. C&apos;est souvent une partie enregistree
            devenue incompatible apres une mise a jour. Repars sur une base
            saine :
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="retro-btn retro-btn-primary w-full"
          >
            Reinitialiser et recharger
          </button>
          <pre className="text-[10px] text-left text-ink/50 overflow-auto max-h-32 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
        </div>
      </div>
    );
  }
}
