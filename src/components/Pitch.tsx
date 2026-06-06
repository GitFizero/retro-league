"use client";

import { SIM_LINE_OF } from "@/lib/engine/positions";
import { shortName } from "@/lib/format";
import type { Line, Player, Position } from "@/lib/types";

export interface PitchSlot {
  key: string;
  /** The formation slot position (e.g. "DC"). */
  position: Position;
  /** Filled player, or undefined for an empty (still-to-draft) slot. */
  player?: Player | null;
  /** Out-of-position coefficient (<1 shows a malus badge). */
  coef?: number;
  selected?: boolean;
  onClick?: () => void;
}

const LINE_COLOR: Record<Line, string> = {
  GK: "#2f7d4f",
  DEF: "#2b5d8a",
  MID: "#7a6a2f",
  ATK: "#C4122F",
};

// Vertical band per line (% from top) — attack high, keeper low.
const LINE_Y: Record<Line, number> = { ATK: 15, MID: 40, DEF: 65, GK: 88 };

// Lateral lane for ordering within a line (-1 left … +1 right).
const LANE: Record<Position, number> = {
  G: 0, DC: 0, DD: 1, DG: -1,
  MDC: 0, MC: 0, MOC: 0, MD: 1, MG: -1,
  BU: 0, AD: 1, AG: -1,
};

const LINE_ORDER: Line[] = ["ATK", "MID", "DEF", "GK"];

/**
 * Football pitch (portrait) placing players in their formation slots, coloured
 * by line. Used by the draft (slots fill one by one) and the composition.
 */
export function Pitch({ slots }: { slots: PitchSlot[] }) {
  const placed: { slot: PitchSlot; x: number; y: number }[] = [];
  for (const line of LINE_ORDER) {
    const group = slots
      .filter((s) => SIM_LINE_OF[s.position] === line)
      .sort((a, b) => LANE[a.position] - LANE[b.position]);
    group.forEach((slot, i) => {
      placed.push({
        slot,
        x: ((i + 1) / (group.length + 1)) * 100,
        y: LINE_Y[line],
      });
    });
  }

  return (
    <div
      className="relative w-full aspect-[7/10] rounded-md overflow-hidden border-2 border-ink/40 select-none"
      style={{
        background:
          "repeating-linear-gradient(0deg,#3f8a52 0,#3f8a52 9%,#3a8049 9%,#3a8049 18%)",
      }}
    >
      {/* field markings */}
      <div className="absolute inset-2 border-2 border-white/30 rounded-sm" />
      <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 border-t-2 border-white/30" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border-2 border-white/30 rounded-full" />
      <div className="absolute left-1/2 -translate-x-1/2 top-2 w-1/3 h-[12%] border-2 border-t-0 border-white/30" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-1/3 h-[12%] border-2 border-b-0 border-white/30" />

      {placed.map(({ slot, x, y }) => {
        const p = slot.player;
        const line = SIM_LINE_OF[slot.position];
        const outOfPos = typeof slot.coef === "number" && slot.coef < 1;
        return (
          <button
            key={slot.key}
            type="button"
            onClick={slot.onClick}
            disabled={!slot.onClick}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-[19%] group"
          >
            <span
              className={[
                "grid place-items-center rounded-full border-2 font-display font-bold text-white shadow-card",
                "w-9 h-9 sm:w-10 sm:h-10 text-sm transition",
                slot.onClick ? "group-hover:scale-110" : "",
                slot.selected ? "ring-4 ring-gold" : "",
                p ? "" : "border-dashed bg-black/20 text-white/70",
              ].join(" ")}
              style={p ? { backgroundColor: LINE_COLOR[line], borderColor: "rgba(0,0,0,0.35)" } : { borderColor: "rgba(255,255,255,0.6)" }}
            >
              {p ? p.overall : slot.position}
            </span>
            <span className="mt-0.5 max-w-full px-1 text-[9px] sm:text-[10px] font-display font-bold leading-none text-white bg-ink/80 rounded-sm truncate">
              {p ? shortName(p.name) : slot.position}
            </span>
            {outOfPos && (
              <span className="text-[8px] text-gold-light font-bold leading-none">
                {Math.round((slot.coef ?? 0) * 100)}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
