import { forwardRef } from "react";
import { Pitch, type PitchSlot } from "@/components/Pitch";
import type { FormationName } from "@/lib/types";

export interface ShareStat {
  label: string;
  value: string | number;
}

/**
 * Self-contained recap card designed to be rasterised to PNG (html-to-image).
 * Fixed width, no external images (the pitch is pure CSS) so capture is clean.
 */
export const ShareCard = forwardRef<
  HTMLDivElement,
  {
    clubName: string;
    badge: string;
    overall: number;
    lineRatings?: { ATK: number; MID: number; DEF: number; GK: number };
    slots: PitchSlot[];
    formation: FormationName;
    stats: ShareStat[];
    notes?: string[];
  }
>(function ShareCard(
  { clubName, badge, overall, lineRatings, slots, formation, stats, notes },
  ref
) {
  const lines = lineRatings
    ? ([
        ["ATT", lineRatings.ATK, "#C4122F"],
        ["MIL", lineRatings.MID, "#7a6a2f"],
        ["DEF", lineRatings.DEF, "#2b5d8a"],
        ["GAR", lineRatings.GK, "#2f7d4f"],
      ] as const)
    : [];

  return (
    <div
      ref={ref}
      style={{ width: 600, fontFamily: "Times New Roman, Georgia, serif" }}
      className="bg-paper text-ink border-4 border-double border-ink p-6"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-ink/50">
            Retro League
          </div>
          <div className="font-display font-black text-3xl leading-none mt-1">
            {clubName}
          </div>
          <div className="mt-2 inline-block border-2 border-ink px-2 py-0.5 font-display font-bold text-sm">
            {badge}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-ink/50">
            Global
          </div>
          <div className="font-display font-black text-5xl leading-none">
            {overall}
          </div>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="flex gap-2 mb-4">
          {lines.map(([label, val, color]) => (
            <div
              key={label}
              className="flex-1 border-2 rounded-sm py-1 text-center"
              style={{ borderColor: color }}
            >
              <div className="text-[10px] tracking-wide text-ink/55">{label}</div>
              <div className="font-display font-black" style={{ color }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[1fr_240px] gap-4 items-start">
        <div className="max-w-[240px]">
          <Pitch slots={slots} formation={formation} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-2 border-ink/20 rounded-sm py-2 text-center"
            >
              <div className="font-display text-xl font-black">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/55">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {notes && notes.length > 0 && (
        <ul className="mt-4 text-sm space-y-1">
          {notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 pt-2 border-t border-ink/15 text-[10px] uppercase tracking-widest text-ink/45 text-center">
        Retro League · inspire de 82-0.com
      </div>
    </div>
  );
});
