"use client";

import { FORMATIONS, SIM_LINE_OF } from "@/lib/engine/positions";
import { shortName } from "@/lib/format";
import type { FormationName, Line, Player, Position } from "@/lib/types";

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

// Exact (x%, y%) per slot, index-aligned to FORMATIONS[name].slots. y: 0 = top
// (attack), 100 = bottom (keeper). Hand-tuned so each formation reads correctly.
const FORMATION_LAYOUT: Record<FormationName, { x: number; y: number }[]> = {
  // [G, DD, DC, DC, DG, MD, MC, MC, MG, BU, BU]
  "4-4-2": [
    { x: 50, y: 90 },
    { x: 84, y: 67 }, { x: 61, y: 70 }, { x: 39, y: 70 }, { x: 16, y: 67 },
    { x: 84, y: 45 }, { x: 61, y: 47 }, { x: 39, y: 47 }, { x: 16, y: 45 },
    { x: 38, y: 17 }, { x: 62, y: 17 },
  ],
  // [G, DD, DC, DC, DG, MDC, MC, MC, AD, BU, AG]
  "4-3-3": [
    { x: 50, y: 90 },
    { x: 84, y: 67 }, { x: 61, y: 70 }, { x: 39, y: 70 }, { x: 16, y: 67 },
    { x: 50, y: 53 }, { x: 70, y: 42 }, { x: 30, y: 42 },
    { x: 84, y: 20 }, { x: 50, y: 14 }, { x: 16, y: 20 },
  ],
  // [G, DD, DC, DC, DG, MDC, MDC, MD, MOC, MG, BU]
  "4-2-3-1": [
    { x: 50, y: 90 },
    { x: 84, y: 67 }, { x: 61, y: 70 }, { x: 39, y: 70 }, { x: 16, y: 67 },
    { x: 62, y: 54 }, { x: 38, y: 54 },
    { x: 84, y: 32 }, { x: 50, y: 32 }, { x: 16, y: 32 },
    { x: 50, y: 14 },
  ],
  // [G, DC, DC, DC, MD, MC, MDC, MC, MG, BU, BU]
  "3-5-2": [
    { x: 50, y: 90 },
    { x: 68, y: 70 }, { x: 50, y: 72 }, { x: 32, y: 70 },
    { x: 88, y: 46 }, { x: 63, y: 44 }, { x: 50, y: 56 }, { x: 37, y: 44 }, { x: 12, y: 46 },
    { x: 38, y: 16 }, { x: 62, y: 16 },
  ],
  // [G, DD, DC, DC, DG, MDC, MC, MC, MOC, BU, BU]
  "4-3-1-2": [
    { x: 50, y: 90 },
    { x: 84, y: 67 }, { x: 61, y: 70 }, { x: 39, y: 70 }, { x: 16, y: 67 },
    { x: 50, y: 56 }, { x: 72, y: 46 }, { x: 28, y: 46 },
    { x: 50, y: 31 },
    { x: 38, y: 16 }, { x: 62, y: 16 },
  ],
};

/**
 * Football pitch (portrait) placing players at their exact formation slots,
 * coloured by line. Used by the draft (slots fill one by one), the composition,
 * the create screen preview and the end-of-season recap.
 */
export function Pitch({
  slots,
  formation,
}: {
  slots: PitchSlot[];
  formation: FormationName;
}) {
  const slotPositions = FORMATIONS[formation].slots;
  const coords = FORMATION_LAYOUT[formation];

  // Pair each provided slot to a formation position (greedy, by position).
  const pool = [...slots];
  const placed = slotPositions.map((pos, i) => {
    let idx = pool.findIndex((s) => s.position === pos);
    if (idx === -1 && pool.length > 0) idx = 0; // fallback: any leftover
    const slot =
      idx >= 0 ? pool.splice(idx, 1)[0] : { key: `ph_${i}`, position: pos };
    return { slot, ...coords[i] };
  });

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
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-[20%] group"
          >
            <span
              className={[
                "grid place-items-center rounded-full border-2 font-display font-bold text-white shadow-card",
                "w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm transition",
                slot.onClick ? "group-hover:scale-110" : "",
                slot.selected ? "ring-4 ring-gold" : "",
                p ? "" : "border-dashed bg-black/20 text-white/70",
              ].join(" ")}
              style={
                p
                  ? { backgroundColor: LINE_COLOR[line], borderColor: "rgba(0,0,0,0.35)" }
                  : { borderColor: "rgba(255,255,255,0.6)" }
              }
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
