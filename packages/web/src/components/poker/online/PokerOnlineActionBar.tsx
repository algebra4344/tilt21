"use client";

import { useState } from "react";
import { usePokerStore } from "@/stores/pokerStore";
import type { HandInfo, PokerAction } from "@/lib/poker/types";
import { classifyContext, getRaiseSize, handString } from "@/lib/poker/engine";
import { formatMoney } from "@/lib/poker/types";

// Player-facing controls for the online (server-dealt) mode. Mirrors
// HomeActionBar but driven by the poker room's TableState.
export default function PokerOnlineActionBar({ seatIndex }: { seatIndex: number }) {
  const act = usePokerStore((s) => s.act);
  const table = usePokerStore((s) => s.table);
  const status = usePokerStore((s) => s.status);
  const toActSeatIndex = usePokerStore((s) => s.toActSeatIndex);

  const [raiseTo, setRaiseTo] = useState("");

  if (!table || status !== "playing") return null;
  const seat = table.seats[seatIndex];
  if (!seat) return null;

  const isYouTurn = toActSeatIndex === seatIndex && !table.handComplete;
  const inHand = !seat.folded && seat.stack > 0;

  const handInfo: HandInfo = {
    street: table.street,
    position: seat.position,
    hand: handString(seat.holeCards),
    context:
      table.street === "preflop"
        ? classifyContext(table.currentBet, table.bigBlind)
        : table.currentBet > table.streetBets[seatIndex]
          ? "vs-raise"
          : "open",
    toCall: Math.max(0, table.currentBet - table.streetBets[seatIndex]),
    raiseAmount: (() => {
      const ctx =
        table.street === "preflop"
          ? classifyContext(table.currentBet, table.bigBlind)
          : table.currentBet > table.streetBets[seatIndex]
            ? "vs-raise"
            : "open";
      return getRaiseSize(table.bigBlind, table.currentBet, ctx, table.street, table.pot);
    })(),
    minRaise: table.minRaise > 0 ? table.minRaise : table.bigBlind,
    equity: null,
    bigBlind: table.bigBlind,
    pot: table.pot,
    heroStack: seat.stack,
    currentBet: table.currentBet,
  };

  const minTarget = handInfo.minRaise;
  const maxTarget = table.streetBets[seatIndex] + seat.stack;

  // Any live player may act at any time during an open betting round —
  // out-of-turn taps are still valid poker actions here.
  if (!inHand || table.handComplete) {
    return (
      <div className="text-center text-sm text-zinc-500 py-2">
        {table.handComplete
          ? "Hand over — dealing next…"
          : seat.folded
            ? "You folded this hand."
            : "You are all-in for this hand."}
      </div>
    );
  }

  const presets: { label: string; amount: number; allIn: boolean }[] = [];
  if (isYouTurn) {
    const base = table.currentBet > 0 ? table.currentBet : table.bigBlind * 3;
    for (const mult of [1, 2.5, 5]) {
      const amount = Math.min(Math.round(base * mult), maxTarget);
      if (
        amount >= minTarget &&
        amount <= maxTarget &&
        amount > table.currentBet &&
        !presets.some((p) => p.amount === amount)
      ) {
        presets.push({
          label: amount === maxTarget ? `All-In ${formatMoney(amount)}` : `To ${formatMoney(amount)}`,
          amount,
          allIn: amount === maxTarget,
        });
      }
    }
    if (maxTarget > table.currentBet && !presets.some((p) => p.amount === maxTarget)) {
      presets.push({ label: `All-In ${formatMoney(maxTarget)}`, amount: maxTarget, allIn: true });
    }
  }

  const doAct = (action: PokerAction, amount?: number) => act(action, amount);

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl px-3 py-2 space-y-2 shadow-xl">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="font-bold text-zinc-200">
          {handInfo.hand} · {handInfo.position} ·{" "}
          <span className="capitalize">{handInfo.street}</span>
        </span>
        <span className="text-zinc-500 font-mono">
          to call:{" "}
          <span className="text-amber-300 font-bold">{formatMoney(handInfo.toCall)}</span>
        </span>
        {!isYouTurn && (
          <span className="text-zinc-500 italic text-xs ml-auto">out of turn</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
        <button
          onClick={() => doAct("fold")}
          className="px-5 py-3 rounded-xl bg-gradient-to-b from-zinc-600 to-zinc-800 border-t border-zinc-500/30 hover:from-zinc-500 hover:to-zinc-700 text-white font-bold shadow-md active:translate-y-0.5 transition-all"
        >
          Fold
        </button>
        <button
          onClick={() => doAct("call")}
          className="px-6 py-3 rounded-xl bg-gradient-to-b from-green-500 to-green-700 border-t border-green-400/30 hover:from-green-400 hover:to-green-600 text-white font-bold shadow-md active:translate-y-0.5 transition-all"
        >
          {handInfo.toCall === 0 ? "Check" : `Call ${formatMoney(handInfo.toCall)}`}
        </button>

        {isYouTurn &&
          presets.map((p) => (
            <button
              key={p.amount}
              onClick={() => doAct(p.allIn && p.amount >= maxTarget ? "raise" : "raise", p.amount)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all active:translate-y-0.5 ${
                p.allIn
                  ? "bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white shadow-md"
                  : "bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white shadow-md"
              }`}
            >
              {p.label}
            </button>
          ))}

        {isYouTurn && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={minTarget}
              max={maxTarget}
              placeholder={`≥${minTarget}`}
              value={raiseTo}
              onChange={(e) => setRaiseTo(e.target.value)}
              className="w-20 px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const v = Number(raiseTo);
                if (v >= minTarget && v <= maxTarget) doAct("raise", v);
                setRaiseTo("");
              }}
              disabled={!raiseTo || Number(raiseTo) < minTarget || Number(raiseTo) > maxTarget}
              className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition-all"
            >
              Bet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
