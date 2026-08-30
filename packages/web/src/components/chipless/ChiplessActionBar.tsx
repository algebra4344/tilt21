"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import type { HomePlayerView } from "@/stores/homeTypes";
import { formatMoney } from "@/lib/poker/types";

type Props = {
  seat: NonNullable<HomePlayerView>;
};

// Chipless action bar — big buttons, one glance. At a real table you say your
// action out loud, then tap it here. Sticky at the bottom for thumbs.
export default function ChiplessActionBar({ seat }: Props) {
  const act = useHomeStore((s) => s.act);
  const buyIn = useHomeStore((s) => s.buyIn);
  const setSittingOut = useHomeStore((s) => s.setSittingOut);
  const table = useHomeStore((s) => s.table);
  const status = useHomeStore((s) => s.status);
  const settings = useHomeStore((s) => s.settings);

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [amount, setAmount] = useState("");

  if (!settings) return null;
  const tSeat = table?.seats[seat.seatIndex];
  const currentStack = tSeat?.stack ?? seat.stack;

  const liveHand = status === "playing" && !!table && !table.handComplete;
  const inHand = !!tSeat && !tSeat.folded && tSeat.stack > 0;
  const canAct = liveHand && inHand && !seat.sittingOut && !seat.fullyOut;

  const toCall = table ? Math.max(0, table.currentBet - table.streetBets[seat.seatIndex]) : 0;
  const maxBet = currentStack + (table?.streetBets[seat.seatIndex] ?? 0);
  const minRaise = table && table.minRaise > 0 ? table.minRaise : settings.bigBlind;

  // Quick bet chips: minimum, half pot, pot
  const pot = table?.pot ?? 0;
  const quickChips = [
    { label: "Min", value: minRaise },
    { label: "½ Pot", value: Math.round(pot / 2) },
    { label: "Pot", value: pot },
  ].filter((c) => c.value > 0 && c.value <= maxBet);

  const doRaise = (target: number) => {
    act("raise", Math.min(target, maxBet));
    setRaiseOpen(false);
    setAmount("");
  };

  return (
    <div className="w-full space-y-2">
      {/* Busted / cash-out state */}
      {(currentStack === 0 || seat.fullyOut) && status !== "ended" && (
        <div className="flex items-center justify-center gap-2 flex-wrap py-1">
          <span className="text-sm ch-muted">
            {seat.fullyOut ? "You cashed out — enjoy the night!" : "Out of chips!"}
          </span>
          <button
            onClick={() => buyIn(settings.defaultBuyIn)}
            className="px-5 py-2.5 rounded-xl bg-[var(--ch-accent)] hover:opacity-90 text-white font-bold text-base transition-colors active:scale-95"
          >
            Buy back in {formatMoney(settings.defaultBuyIn)}
          </button>
        </div>
      )}

      {/* Waiting states */}
      {!canAct && status === "playing" && !seat.fullyOut && (
        <div className="text-center text-sm ch-muted py-2">
          {table?.handComplete
            ? "Hand over — waiting for the host to award"
            : seat.sittingOut
              ? "Sitting out"
              : tSeat?.folded
                ? "You folded"
                : "Waiting…"}
        </div>
      )}

      {/* Act buttons — only while it's a live hand and you're in */}
      {canAct && (
        <>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => act("fold")}
              className="flex-1 py-4 rounded-2xl bg-[var(--ch-surface-2)] border border-[var(--ch-border)] hover:border-[var(--ch-muted)] text-[var(--ch-text)] font-bold text-lg shadow-sm active:translate-y-0.5 transition-all"
            >
              Fold
            </button>
            <button
              onClick={() => act("call")}
              className="flex-[2] py-4 rounded-2xl bg-gradient-to-b from-green-500 to-green-700 border-t border-green-400/30 hover:from-green-400 hover:to-green-600 text-white font-bold text-lg shadow-md shadow-green-900/50 active:translate-y-0.5 transition-all"
            >
              {toCall === 0
                ? "Check"
                : toCall >= currentStack
                  ? `All-In ${formatMoney(currentStack)}`
                  : `Call ${formatMoney(toCall)}`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!raiseOpen ? (
              <button
                onClick={() => setRaiseOpen(true)}
                className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base transition-colors active:scale-95"
              >
                Bet or raise
              </button>
            ) : (
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  min={minRaise}
                  max={maxBet}
                  placeholder={`${minRaise}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-28 px-3 py-3 rounded-xl ch-input text-lg font-bold"
                />
                <button
                  onClick={() => {
                    const v = Number(amount);
                    if (v >= minRaise) doRaise(v);
                  }}
                  disabled={!amount || Number(amount) < minRaise}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-lg transition-colors active:scale-95"
                >
                  Bet {amount ? formatMoney(Number(amount)) : ""}
                </button>
              </>
            )}
            <button
              onClick={() => doRaise(maxBet)}
              className="px-4 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors active:scale-95"
            >
              All-In
            </button>
          </div>

          {raiseOpen && (
            <div className="flex items-center justify-center gap-2">
              {quickChips.map((c) => (
                <button
                  key={c.label}
                  onClick={() => doRaise(c.value)}
                  className="px-3 py-2 rounded-xl ch-card-2 hover:border-[var(--ch-gold)] text-xs font-bold transition-colors"
                >
                  {c.label} {formatMoney(c.value)}
                </button>
              ))}
              <button
                onClick={() => setRaiseOpen(false)}
                className="px-3 py-2 rounded-xl ch-muted text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {/* Lobby / between hands */}
      {!canAct && status !== "playing" && !seat.fullyOut && (
        <div className="flex items-center justify-center gap-3 py-1">
          <button
            onClick={() => setSittingOut(!seat.sittingOut)}
            className="px-3 py-2 rounded-lg text-xs ch-muted hover:opacity-70 transition-opacity"
          >
            {seat.sittingOut ? "Sit back in" : "Sit out next hand"}
          </button>
        </div>
      )}
    </div>
  );
}