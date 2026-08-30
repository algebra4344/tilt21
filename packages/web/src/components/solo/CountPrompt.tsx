"use client";

import { useState, useEffect, useRef } from "react";

type CountPromptProps = {
  active: boolean;
  feedback: "correct" | "wrong" | null;
  runningCount: number;
  trueCount: number;
  decksRemaining: number;
  onSubmit: (value: number) => boolean;
};

// The parent should remount this component with a changing `key` each time
// the prompt becomes active so `guess` resets without an effect.
export default function CountPrompt({
  active,
  feedback,
  runningCount,
  trueCount,
  decksRemaining,
  onSubmit,
}: CountPromptProps) {
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus after a tick so the modal is mounted.
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!active) return null;

  const rcDisplay = `${runningCount > 0 ? "+" : ""}${runningCount}`;
  const tcDisplay = `${trueCount > 0 ? "+" : ""}${trueCount.toFixed(1)}`;
  const decksLabel = decksRemaining > 0 ? decksRemaining.toFixed(1) : "—";

  const submit = () => {
    const value = Number(guess);
    if (Number.isFinite(value)) {
      onSubmit(value);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className={`bg-zinc-900/95 border rounded-2xl p-6 text-center w-80 shadow-2xl ${
          feedback === "wrong" ? "animate-shake border-red-500/50" : "border-zinc-700"
        }`}
      >
        <div className="text-sm text-zinc-400 mb-1">
          RC {rcDisplay} · {decksLabel} decks remaining
        </div>
        <div className="text-lg font-bold text-zinc-100 mb-4">
          What is the True Count?
        </div>

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="number"
            step="0.1"
            value={guess}
            disabled={feedback !== null}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="e.g. +2"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-lg text-zinc-100 font-mono disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={feedback !== null}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            OK
          </button>
        </div>

        {feedback === "correct" && (
          <div className="text-green-400 font-bold">
            ✓ Correct — TC {tcDisplay}
          </div>
        )}
        {feedback === "wrong" && (
          <div className="text-red-400 font-mono text-sm">
            ✗ {rcDisplay} ÷ {decksLabel} = TC {tcDisplay}
          </div>
        )}
        {feedback === null && (
          <div className="text-[10px] text-zinc-600">
            Enter to submit · Round TC to 1 decimal
          </div>
        )}
      </div>
    </div>
  );
}