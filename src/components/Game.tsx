"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { useChallenge } from "@/lib/challenge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Bilan } from "@/components/screens/Bilan";
import { readReportFromHash } from "@/lib/report";
import { Home } from "@/components/screens/Home";
import { Draft } from "@/components/screens/Draft";
import { Composition } from "@/components/screens/Composition";
import { Season } from "@/components/screens/Season";
import { Mercato } from "@/components/screens/Mercato";
import { HallOfFame } from "@/components/screens/HallOfFame";
import { Challenge } from "@/components/screens/Challenge";

export function Game() {
  const [mounted, setMounted] = useState(false);
  const league = useGame((s) => s.league);
  const challengePhase = useChallenge((s) => s.phase);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-display text-2xl text-retro animate-pulse">
          RETRO LEAGUE
        </div>
      </div>
    );
  }

  // Lien de bilan partage (#bilan=...) : on affiche la page bilan en lecture
  // seule, avant tout le reste.
  const shared = readReportFromHash();
  if (shared) {
    return (
      <ErrorBoundary>
        <Bilan report={shared} shared />
      </ErrorBoundary>
    );
  }

  // Mode Defi prend la priorite tant qu'il est actif.
  const screen = (() => {
    if (challengePhase !== "idle") return <Challenge />;
    if (!league) return <Home />;
    switch (league.status) {
      case "draft":
        return <Draft />;
      case "composition":
        return <Composition />;
      case "season":
        return <Season />;
      case "mercato":
        return <Mercato />;
      case "finished":
        return <HallOfFame />;
      default:
        return <Home />;
    }
  })();

  return <ErrorBoundary>{screen}</ErrorBoundary>;
}
