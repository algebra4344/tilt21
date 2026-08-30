"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import { formatMoney } from "@/lib/poker/types";

// Host controls for chipless: deal, advance street, award the pot to the
// player(s) who actually won, end the night. No poker jargon, big buttons.
export default function ChiplessHostBar() {
  const seats = useHomeStore((s) => s.seats);
  const table = useHomeStore((s) => s.table);
  const status = useHomeStore((s) => s.status);
  const startHand = useHomeStore((s) => s.startHand);
  const nextStreet = useHomeStore((s) => s.nextStreet);
  const award = useHomeStore((s) => s.award);
  const endNight = useHomeStore((s) => s.endNight);

  const [awardOpen, setAwardOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (status === "ended") return null;

  const seatedCount = seats.filter(Boolean).length;
  const handComplete = !!table?.handComplete;
  const inHand = status === "playing" && !handComplete;

  const canDeal = seatedCount >= 2 && (!inHand || handComplete);
  const street = table?.street ?? "preflop";
  const nextStreetLabel =
    street === "preflop" ? "Flop" : street === "flop" ? "Turn" : street === "turn" ? "River" : null;

  const eligible = seats.filter(
    (s): s is NonNullable<(typeof seats)[number]> =>
      s !== null && !s.fullyOut && !s.sittingOut && s.stack > 0,
  );

  const openAward = () => {
    setPicked([]);
    setAwardOpen(true);
  };

  const confirmAward = () => {
    if (picked.length === 0) return;
    award([picked]); // all picked players split the pot evenly
    setAwardOpen(false);
    setPicked([]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!inHand && (
        <button
          onClick={startHand}
          disabled={!canDeal}
          title={seatedCount < 2 ? "Need at least 2 players to deal" : undefined}
          className="px-5 py-3 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-md shadow-emerald-900/40 transition-all active:translate-y-0.5"
        >
          {handComplete ? "Deal next hand" : seatedCount < 2 ? `Deal (${seatedCount}/2)` : "Deal hand"}
        </button>
      )}

      {inHand && (
        <>
          {nextStreetLabel ? (
            <button
              onClick={nextStreet}
              className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base transition-colors active:translate-y-0.5"
            >
              Next street: {nextStreetLabel}
            </button>
          ) : (
            <button
              onClick={openAward}
              className="px-5 py-3 rounded-2xl bg-[var(--ch-accent)] hover:opacity-90 text-white font-bold text-base transition-colors active:translate-y-0.5"
            >
              Award pot
            </button>
          )}
        </>
      )}

      {status === "playing" && (
        <button
          onClick={() => {
            if (!confirmEnd) {
              setConfirmEnd(true);
              setTimeout(() => setConfirmEnd(false), 3000);
              return;
            }
            endNight();
            setConfirmEnd(false);
          }}
          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ml-auto ${
            confirmEnd ? "bg-[var(--ch-danger)] text-white" : "ch-btn-ghost ch-muted"
          }`}
        >
          {confirmEnd ? "Tap again to end" : "End night"}
        </button>
      )}

      {/* Award modal */}
      {awardOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md ch-page rounded-t-2xl sm:rounded-2xl p-5 space-y-4 border border-[var(--ch-border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Who won the pot?</h3>
              <button
                onClick={() => setAwardOpen(false)}
                className="ch-muted hover:opacity-70 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-sm ch-muted">
              Tap the winner. Tap more than one to split the pot.
            </p>

            <div className="flex flex-wrap gap-2">
              {eligible.map((s) => {
                const isPicked = picked.includes(s.seatIndex);
                return (
                  <button
                    key={s.seatIndex}
                    onClick={() =>
                      setPicked((prev) =>
                        isPicked
                          ? prev.filter((i) => i !== s.seatIndex)
                          : [...prev, s.seatIndex],
                      )
                    }
                    className={`px-4 py-3 rounded-xl border text-base font-bold transition-colors active:scale-95 ${
                      isPicked ? "ch-selected ch-accent" : "ch-card-2"
                    }`}
                  >
                    {s.name}
                    {isPicked && " ✓"}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAwardOpen(false)}
                className="flex-1 py-3 rounded-xl ch-btn-ghost font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmAward}
                disabled={picked.length === 0}
                className="flex-[2] py-3 rounded-xl bg-[var(--ch-accent)] hover:opacity-90 disabled:opacity-40 text-white font-bold"
              >
                Award {formatMoney(table?.pot ?? 0)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}