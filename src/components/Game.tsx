"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { Home } from "@/components/screens/Home";
import { Draft } from "@/components/screens/Draft";
import { Composition } from "@/components/screens/Composition";
import { Season } from "@/components/screens/Season";
import { Mercato } from "@/components/screens/Mercato";
import { HallOfFame } from "@/components/screens/HallOfFame";

export function Game() {
  const [mounted, setMounted] = useState(false);
  const league = useGame((s) => s.league);

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
}
