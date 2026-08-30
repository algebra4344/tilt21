"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import type { HomePlayerView } from "@/stores/homeTypes";
import { formatMoney } from "@/lib/poker/types";

type Props = {
  seat: NonNullable<HomePlayerView>;
};

// Player-facing controls for their own seat. Visible while betting is open;
// disabled when folded or all-in. Includes self-service buy-in.
export default function HomeActionBar({ seat }: Props) {
  const act = useHomeStore((s) => s.act);
  const buyIn = useHomeStore((s) => s.buyIn);
  const setSittingOut = useHomeStore((s) => s.setSittingOut);
  const table = useHomeStore((s) => s.table);
  const status = useHomeStore((s) => s.status);
  const settings = useHomeStore((s) => s.settings);

  const [raiseTo, setRaiseTo] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  if (!settings) return null;
  const tableSeat = table?.seats[seat.seatIndex];

  const liveHand =
    status === "playing" && table !== null && !table.handComplete;
  const inHand =
    !!tableSeat && !tableSeat.folded && tableSeat.stack > 0;
  const canAct = liveHand && inHand && !seat.sittingOut && !seat.fullyOut;

  const toCall = table
    ? Math.max(0, table.currentBet - table.streetBets[seat.seatIndex])
    : 0;
  const isAllInCall = toCall >= seat.stack;

  const minRaiseTarget =
    table && table.minRaise > 0
      ? table.minRaise
      : settings.bigBlind * ((table?.currentBet ?? 0) > 0 ? 2 : 1);

  const presets: { label: string; target: number }[] = [];
  if (canAct && table) {
    const base = table.currentBet > 0 ? table.currentBet : table.bigBlind * 2;
    for (const mult of [2, 3, 5]) {
      const target = Math.min(base * mult, table.streetBets[seat.seatIndex] + seat.stack);
      if (
        target > table.currentBet &&
        target <= table.streetBets[seat.seatIndex] + seat.stack &&
        !presets.some((p) => p.target === target)
      ) {
        presets.push({
          label:
            target === table.streetBets[seat.seatIndex] + seat.stack
              ? `All-In ${formatMoney(target)}`
              : `To ${formatMoney(target)}`,
          target,
        });
      }
    }
    const maxTarget = table.streetBets[seat.seatIndex] + seat.stack;
    if (maxTarget > table.currentBet && !presets.some((p) => p.target === maxTarget)) {
      presets.push({ label: `All-In ${formatMoney(maxTarget)}`, target: maxTarget });
    }
  }

  return (
    <div className="w-full space-y-2">
      {!canAct && status === "playing" && !!table?.handComplete && !seat.fullyOut && (
        <p className="text-center text-sm text-zinc-500 py-2">
          Hand over — waiting for the host to award
        </p>
      )}

      {(seat.stack === 0 || seat.fullyOut) && status !== "ended" && (
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <span className="text-sm text-zinc-400">
            {seat.fullyOut ? "You cashed out." : "You're out of chips!"}
          </span>
          <input
            type="number"
            min={1}
            placeholder={`${settings.defaultBuyIn}`}
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="w-24 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => {
              const amt = Number(buyAmount) || settings.defaultBuyIn;
              buyIn(amt);
              setBuyAmount("");
            }}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            Buy in {formatMoney(Number(buyAmount) || settings.defaultBuyIn)}
          </button>
        </div>
      )}

      {canAct && (
        <>
          <p className="text-xs text-center uppercase tracking-wider text-zinc-500">
            Your move — to call{" "}
            <span className="text-amber-300 font-bold">{formatMoney(toCall)}</span>
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => act("fold")}
              className="px-5 py-3 rounded-xl bg-gradient-to-b from-zinc-600 to-zinc-800 border-t border-zinc-500/30 hover:from-zinc-500 hover:to-zinc-700 text-white font-bold shadow-md shadow-zinc-900/50 active:translate-y-0.5 transition-all"
            >
              Fold
            </button>
            <button
              onClick={() => act("call")}
              className="px-6 py-3 rounded-xl bg-gradient-to-b from-green-500 to-green-700 border-t border-green-400/30 hover:from-green-400 hover:to-green-600 text-white font-bold shadow-md shadow-green-900/50 active:translate-y-0.5 transition-all"
            >
              {toCall === 0
                ? "Check"
                : isAllInCall
                  ? `All-In ${formatMoney(seat.stack)}`
                  : `Call ${formatMoney(toCall)}`}
            </button>
            {presets.map((p) => (
              <button
                key={p.target}
                onClick={() => act("raise", p.target)}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all active:translate-y-0.5 ${
                  p.label.startsWith("All-In")
                    ? "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white shadow-md shadow-red-900/50"
                    : "bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white shadow-md shadow-amber-900/50"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={minRaiseTarget}
                max={table.streetBets[seat.seatIndex] + seat.stack}
                placeholder={`≥${minRaiseTarget}`}
                value={raiseTo}
                onChange={(e) => setRaiseTo(e.target.value)}
                className="w-20 px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  const v = Number(raiseTo);
                  if (v >= minRaiseTarget) act("raise", v);
                  setRaiseTo("");
                }}
                disabled={!raiseTo || Number(raiseTo) < minRaiseTarget}
                className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition-all"
              >
                Bet
              </button>
            </div>
          </div>
        </>
      )}

      {status === "playing" && !!table?.handComplete && seat.fullyOut && (
        <p className="text-center text-sm text-zinc-500 py-2">Enjoy the night!</p>
      )}

      {!seat.fullyOut && status === "lobby" && (
        <button
          onClick={() => setSittingOut(!seat.sittingOut)}
          className="mx-auto block text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {seat.sittingOut ? "Sit back in" : "Sit out next hand"}
        </button>
      )}
    </div>
  );
}
