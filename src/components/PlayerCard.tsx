"use client";

import { POSITION_LABEL, SIM_LINE_OF } from "@/lib/engine/positions";
import { hasLegend } from "@/lib/content/legendary";
import type { Line, Player, Position } from "@/lib/types";

function ratingTone(overall: number): string {
  if (overall >= 86) return "panini-foil text-ink border-ink";
  if (overall >= 80) return "bg-ink text-paper border-ink";
  return "bg-paper text-ink border-ink/60";
}

/** Colour accent by line — a Panini-style left stripe. */
const LINE_COLOR: Record<Line, string> = {
  GK: "#2f7d4f",
  DEF: "#2b5d8a",
  MID: "#7a6a2f",
  ATK: "#C4122F",
};

export function initials(name: string): string {
  const parts = name.split(" ");
  const last = parts[parts.length - 1] ?? "";
  return ((parts[0]?.[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export function PlayerCard({
  player,
  onClick,
  selected,
  assignedPosition,
  coefficient,
  compact,
}: {
  player: Player;
  onClick?: () => void;
  selected?: boolean;
  assignedPosition?: Position;
  coefficient?: number;
  compact?: boolean;
}) {
  const legend = hasLegend(player.name);
  const outOfPos = typeof coefficient === "number" && coefficient < 1;
  const line = SIM_LINE_OF[player.position];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        "panini retro-card relative text-left p-3 pl-4 w-full transition",
        onClick ? "active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-card-lift" : "",
        selected ? "ring-4 ring-gold" : "",
        legend ? "border-gold" : "",
        "disabled:hover:translate-y-0",
      ].join(" ")}
    >
      <span
        className="panini-stripe"
        style={{ backgroundColor: LINE_COLOR[line] }}
      />
      {legend && (
        <span
          title="Moment Legendaire"
          className="absolute -top-2 -right-2 panini-foil text-ink border-2 border-ink rounded-full w-7 h-7 grid place-items-center text-sm shadow-card"
        >
          ★
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="shrink-0 text-center">
          <div
            className={`grid place-items-center w-12 h-12 border-2 rounded-sm font-display font-extrabold text-xl ${ratingTone(
              player.overall
            )}`}
          >
            {player.overall}
          </div>
          <div className="text-[10px] font-display font-bold tracking-wider text-ink/60 mt-0.5">
            {player.position}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold leading-tight truncate">
            {player.name}
          </div>
          <div className="text-xs text-ink/70 truncate">
            {assignedPosition && assignedPosition !== player.position ? (
              <span className={outOfPos ? "text-retro font-semibold" : ""}>
                {assignedPosition}
                {typeof coefficient === "number" &&
                  ` ${Math.round(coefficient * 100)}%`}
              </span>
            ) : (
              POSITION_LABEL[player.position]
            )}
            {" · "}
            {player.nationality}
          </div>
          {!compact && (
            <div className="text-[11px] uppercase tracking-wide text-ink/55 truncate">
              {player.club} {player.season}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
