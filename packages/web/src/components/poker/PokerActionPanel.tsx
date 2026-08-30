"use client";

import { useState } from "react";
import type { HandInfo, PokerAction, Street } from "@/lib/poker/types";
import { formatMoney } from "@/lib/poker/types";

type PokerActionPanelProps = {
  handInfo: HandInfo;
  disabled: boolean;
  onAct: (action: PokerAction, amount?: number) => void;
};

const STREET_LABELS: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

export default function PokerActionPanel({
  handInfo,
  disabled,
  onAct,
}: PokerActionPanelProps) {
  const { bigBlind, heroStack, currentBet } = handInfo as HandInfo & {
    bigBlind: number;
    pot: number;
    heroStack: number;
    currentBet: number;
  };
  const contextLabel =
    handInfo.street === "preflop"
      ? handInfo.context === "open"
        ? "Unopened pot"
        : handInfo.context === "vs-raise"
          ? "Facing a raise"
          : "Facing a 3-bet"
      : handInfo.toCall === 0
        ? "First to act"
        : "Facing a bet";

  const minTarget = handInfo.minRaise > 0 ? handInfo.minRaise : bigBlind;
  const isShortCall = handInfo.toCall > heroStack && heroStack > 0;
  const callLabel = handInfo.toCall === 0
    ? "Check"
    : isShortCall
      ? `All-In ${formatMoney(heroStack)}`
      : `Call ${formatMoney(handInfo.toCall)}`;

  const presets: { label: string; amount: number; isAllIn: boolean }[] = [];
  if (heroStack > 0) {
    // Base is the current bet, or a standard open size when checking
    const base = currentBet > 0 ? currentBet : bigBlind * 3;
    const raise2x = Math.min(base * 2, heroStack);
    const raise3x = Math.min(base * 3, heroStack);
    const raise5x = Math.min(base * 5, heroStack);
    const seen = new Set<number>();
    for (const amount of [raise2x, raise3x, raise5x]) {
      if (amount <= heroStack && amount > 0 && amount >= minTarget && !seen.has(amount)) {
        seen.add(amount);
        const capped = amount === heroStack;
        presets.push({
          label: capped ? `All-In ${formatMoney(amount)}` : `Raise ${formatMoney(amount)}`,
          amount,
          isAllIn: capped,
        });
      }
    }
    if (heroStack > (presets[presets.length - 1]?.amount ?? 0)) {
      presets.push({ label: `All-In ${formatMoney(heroStack)}`, amount: heroStack, isAllIn: true });
    }
  }

  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const handleCustomRaise = () => {
    const val = Number(customAmount);
    if (!isNaN(val) && val >= minTarget && val <= heroStack) {
      onAct("raise", val);
      setCustomMode(false);
      setCustomAmount("");
    }
  };

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 space-y-2">
      {/* Compact info row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-zinc-200">
          {handInfo.hand} · {handInfo.position} · {STREET_LABELS[handInfo.street]}
        </span>
        <span
          className={`text-xs font-mono px-1.5 py-0.5 rounded ${
            handInfo.context === "open"
              ? "bg-green-500/10 text-green-300"
              : handInfo.context === "vs-raise"
                ? "bg-amber-500/10 text-amber-300"
                : "bg-red-500/10 text-red-300"
          }`}
        >
          {contextLabel}
        </span>
        <span className="text-sm text-zinc-500 font-mono">
          {isShortCall ? "all-in" : "to call"}:{" "}
          <span className="text-zinc-300 font-bold">
            {formatMoney(isShortCall ? heroStack : handInfo.toCall)}
          </span>
        </span>
        {handInfo.equity !== null && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-sm font-bold ${
            Math.round(handInfo.equity) >= 60
              ? "bg-green-500/15 text-green-300"
              : Math.round(handInfo.equity) >= 40
                ? "bg-amber-500/15 text-amber-300"
                : "bg-red-500/15 text-red-300"
          }`}>
            Eq {Math.round(handInfo.equity)}%
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => onAct("fold")}
          disabled={disabled}
          className="px-3 py-2 min-h-11 sm:min-h-9 rounded-lg bg-gradient-to-b from-zinc-600 to-zinc-800 border-t border-zinc-500/30 hover:from-zinc-500 hover:to-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md shadow-zinc-900/50 active:translate-y-0.5 active:shadow-sm"
        >
          Fold
        </button>
        <button
          onClick={() => onAct("call")}
          disabled={disabled}
          className="px-3 py-2 min-h-11 sm:min-h-9 rounded-lg bg-gradient-to-b from-green-500 to-green-700 border-t border-green-400/30 hover:from-green-400 hover:to-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md shadow-green-900/50 active:translate-y-0.5 active:shadow-sm"
        >
          {callLabel}
        </button>
        {presets.map((p) => {
          return (
            <button
              key={p.amount}
              onClick={() => onAct(p.isAllIn && heroStack <= currentBet ? "call" : "raise", p.amount)}
              disabled={disabled || p.amount > heroStack}
              className={`px-3 py-2 min-h-11 sm:min-h-9 rounded-lg text-sm font-semibold transition-all ${
                p.isAllIn
                  ? "bg-gradient-to-b from-red-500 to-red-700 border-t border-red-400/30 hover:from-red-400 hover:to-red-600 shadow-md shadow-red-900/50"
                  : "bg-gradient-to-b from-amber-500 to-amber-700 border-t border-amber-400/30 hover:from-amber-400 hover:to-amber-600 shadow-md shadow-amber-900/50"
              } disabled:opacity-40 disabled:cursor-not-allowed text-white active:translate-y-0.5 active:shadow-sm`}
            >
              {p.label}
            </button>
          );
        })}
        {/* Custom amount toggle */}
        {!customMode && heroStack > 0 && (
          <button
            onClick={() => setCustomMode(true)}
            disabled={disabled}
            className="px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-400 text-sm font-mono transition-all"
          >
            ...
          </button>
        )}
      </div>

      {/* Custom amount input */}
      {customMode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 font-mono">Raise to</span>
          <input
            type="number"
            min={minTarget}
            max={heroStack}
            step={bigBlind}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomRaise()}
            placeholder={`${formatMoney(minTarget)} - ${formatMoney(heroStack)}`}
            className="w-28 px-3 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-mono focus:border-amber-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCustomRaise}
            disabled={!customAmount || Number(customAmount) < minTarget || Number(customAmount) > heroStack}
            className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
          >
            Raise
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomAmount(""); }}
            className="px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
