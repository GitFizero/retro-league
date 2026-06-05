"use client";

import { useState } from "react";
import { Shell } from "@/components/Shell";
import { useGame, HUMAN_CLUB_ID } from "@/lib/store";
import { getPlayer } from "@/lib/content/teams";
import type { Player } from "@/lib/types";

export function Mercato() {
  const league = useGame((s) => s.league);
  const human = useGame((s) => s.humanClub());
  const offers = useGame((s) => s.offers);
  const accept = useGame((s) => s.acceptOffer);
  const reject = useGame((s) => s.rejectOffer);
  const propose = useGame((s) => s.proposeTrade);
  const resume = useGame((s) => s.resumeFromMercato);

  const aiClubs = (league?.clubs ?? []).filter((c) => c.isAI);
  const [targetId, setTargetId] = useState(aiClubs[0]?.id ?? "");
  const [give, setGive] = useState<string>("");
  const [want, setWant] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!league || !human) return null;
  const target = aiClubs.find((c) => c.id === targetId);

  const submitProposal = () => {
    if (!give || !want) return;
    const res = propose(targetId, [give], [want]);
    if (res.accepted) {
      setFeedback("Echange accepte ! Les deux clubs ont signe.");
      setGive("");
      setWant("");
    } else {
      setFeedback("Refuse. Le club adverse n'y trouve pas son compte.");
    }
  };

  return (
    <Shell subtitle="Mercato d'hiver — uniquement des echanges">
      <p className="text-ink/75 mb-6 text-sm max-w-2xl">
        Pas d&apos;argent, pas de salaire, pas de contrat. Uniquement des
        echanges de joueurs. <strong>Les deux clubs doivent accepter.</strong>
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="retro-card p-5">
          <h3 className="font-display text-xl font-bold border-b-2 border-ink/30 pb-2 mb-4">
            Offres recues
          </h3>
          {offers.filter((o) => o.toClubId === HUMAN_CLUB_ID).length === 0 && (
            <p className="text-sm text-ink/55 italic">
              Aucune offre pour le moment.
            </p>
          )}
          <ul className="space-y-4">
            {offers
              .filter((o) => o.toClubId === HUMAN_CLUB_ID)
              .map((o) => {
                const from = league.clubs.find((c) => c.id === o.fromClubId);
                return (
                  <li key={o.id} className="border-2 border-ink/30 rounded-sm p-3">
                    <div className="text-xs uppercase tracking-wide text-ink/60 mb-2">
                      {from?.name} propose
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                      <PlayerNames ids={o.offered} />
                      <span className="font-display font-bold text-retro">⇄</span>
                      <PlayerNames ids={o.requested} />
                    </div>
                    {o.status === "pending" ? (
                      <div className="flex gap-2 mt-3">
                        <button
                          className="retro-btn retro-btn-primary text-xs flex-1"
                          onClick={() => accept(o.id)}
                        >
                          Accepter
                        </button>
                        <button
                          className="retro-btn text-xs flex-1"
                          onClick={() => reject(o.id)}
                        >
                          Refuser
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs mt-2 font-semibold uppercase text-ink/60">
                        {o.status === "accepted" ? "✓ Accepte" : "✗ Refuse"}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>

        <section className="retro-card p-5">
          <h3 className="font-display text-xl font-bold border-b-2 border-ink/30 pb-2 mb-4">
            Proposer un echange
          </h3>
          <label className="block text-sm font-semibold mb-1">Club cible</label>
          <select
            className="w-full border-2 border-ink rounded-sm px-2 py-1.5 bg-paper mb-4"
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setWant("");
            }}
          >
            {aiClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <PlayerPicker
              label="Vous offrez"
              ids={human.squad}
              value={give}
              onChange={setGive}
            />
            <PlayerPicker
              label="Vous demandez"
              ids={target?.squad ?? []}
              value={want}
              onChange={setWant}
            />
          </div>

          <button
            className="retro-btn retro-btn-primary w-full mt-4"
            disabled={!give || !want}
            onClick={submitProposal}
          >
            Envoyer l&apos;offre
          </button>
          {feedback && (
            <p className="text-sm mt-3 font-semibold text-center">{feedback}</p>
          )}
        </section>
      </div>

      <div className="mt-8 text-center">
        <button
          className="retro-btn retro-btn-gold"
          onClick={() => resume()}
        >
          Reprendre le championnat →
        </button>
      </div>
    </Shell>
  );
}

function PlayerNames({ ids }: { ids: string[] }) {
  return (
    <div className="space-y-0.5">
      {ids.map((id) => {
        const p = getPlayer(id);
        return (
          <div key={id} className="truncate">
            {p ? `${p.name} (${p.overall})` : id}
          </div>
        );
      })}
    </div>
  );
}

function PlayerPicker({
  label,
  ids,
  value,
  onChange,
}: {
  label: string;
  ids: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const players = ids
    .map(getPlayer)
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => b.overall - a.overall);
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <select
        className="w-full border-2 border-ink rounded-sm px-2 py-1.5 bg-paper"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={8}
      >
        <option value="">—</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.position} · {p.overall}
          </option>
        ))}
      </select>
    </div>
  );
}
