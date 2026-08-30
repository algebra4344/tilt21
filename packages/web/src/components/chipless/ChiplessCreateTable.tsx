"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import { formatMoney } from "@/lib/poker/types";
import { useChiplessThemeValue } from "@/lib/chiplessTheme";

const DEFAULT_STAKE = { sb: 5, bb: 10, buyIn: 1000 };

const STAKES = [
  { label: "Low", sb: 1, bb: 2, buyIn: 200 },
  { label: "Medium", sb: 5, bb: 10, buyIn: 1000 },
  { label: "High", sb: 25, bb: 50, buyIn: 5000 },
];

export default function ChiplessCreateTable() {
  const createTable = useHomeStore((s) => s.createTable);
  const guestName = useHomeStore((s) => s.guestName);
  const setGuestName = useHomeStore((s) => s.setGuestName);
  const error = useHomeStore((s) => s.error);
  const { theme, toggle: toggleTheme } = useChiplessThemeValue();

  const [showOptions, setShowOptions] = useState(false);
  const [tableName, setTableName] = useState("");
  const [stakeIdx, setStakeIdx] = useState(1);
  const stake = showOptions ? STAKES[stakeIdx] : DEFAULT_STAKE;

  const start = () => {
    createTable({
      name: tableName.trim() || undefined,
      maxPlayers: 8,
      smallBlind: stake.sb,
      bigBlind: stake.bb,
      defaultBuyIn: stake.buyIn,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto ch-card rounded-2xl p-6 space-y-5 relative">
      <button
        onClick={toggleTheme}
        title={theme === "light" ? "Dark mode" : "Light mode"}
        className="absolute top-4 right-4 w-9 h-9 rounded-xl ch-btn-ghost flex items-center justify-center text-xs font-bold transition-colors"
      >
        {theme === "light" ? "Dark" : "Light"}
      </button>

      <div>
        <h1 className="text-2xl font-black">Chipless</h1>
        <p className="text-sm ch-muted mt-1">
          Real cards. Your phone tracks the chips.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wider ch-muted">Your name</label>
        <input
          value={guestName}
          maxLength={20}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && guestName.trim() && start()}
          placeholder="What should we call you?"
          className="w-full px-4 py-3 rounded-xl ch-input text-base font-semibold"
        />
      </div>

      <button
        onClick={start}
        disabled={!guestName.trim()}
        className="w-full py-4 rounded-2xl bg-[var(--ch-accent)] hover:opacity-90 disabled:opacity-40 text-white font-black text-lg shadow-lg transition-all active:translate-y-0.5"
      >
        Start table
      </button>

      <p className="text-center text-xs ch-muted">
        {formatMoney(DEFAULT_STAKE.sb)}/{formatMoney(DEFAULT_STAKE.bb)} blinds ·{" "}
        {formatMoney(DEFAULT_STAKE.buyIn)} buy-in · share the link after
      </p>

      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        className="w-full text-sm ch-muted hover:opacity-80 transition-opacity"
      >
        {showOptions ? "Hide options" : "Customize blinds or table name"}
      </button>

      {showOptions && (
        <div className="space-y-4 pt-1 border-t border-[var(--ch-border)]">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider ch-muted">Table name (optional)</span>
            <input
              value={tableName}
              placeholder="Friday night"
              maxLength={60}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg ch-input"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider ch-muted">Blinds</span>
            <div className="grid grid-cols-3 gap-2">
              {STAKES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStakeIdx(i)}
                  className={`py-3 rounded-xl border transition-all active:scale-95 ${
                    stakeIdx === i ? "ch-selected" : "ch-card-2"
                  }`}
                >
                  <span className={`block font-bold text-sm ${stakeIdx === i ? "ch-accent" : ""}`}>
                    {s.label}
                  </span>
                  <span className="block ch-muted text-[10px] mt-0.5 font-mono">
                    {formatMoney(s.sb)}/{formatMoney(s.bb)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-[var(--ch-danger)] text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
