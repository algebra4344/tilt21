"use client";

import { useState } from "react";
import type {
  PracticeSettings,
  PracticeMode,
  SeatPosition,
} from "@/hooks/useSoloGame";

type PracticeSettingsProps = {
  currentSettings: PracticeSettings;
  onApply: (settings: PracticeSettings) => void;
};

const MODE_OPTIONS: { value: PracticeMode; label: string; desc: string }[] = [
  { value: "default", label: "Standard", desc: "Normal shoe play" },
  { value: "pairs", label: "Pairs", desc: "Practice split decisions" },
  { value: "uncommon", label: "Uncommon", desc: "Rare hand scenarios" },
  { value: "deviations", label: "Deviations", desc: "I18 + Fab4 training" },
];

const SEAT_OPTIONS: {
  value: SeatPosition;
  label: string;
  desc: string;
}[] = [
  {
    value: "first_base",
    label: "First Base",
    desc: "Plays first, fewer visible cards",
  },
  {
    value: "third_base",
    label: "Third Base",
    desc: "Plays last, see more cards",
  },
];

export default function PracticeSettingsPanel({
  currentSettings,
  onApply,
}: PracticeSettingsProps) {
  const [settings, setSettings] = useState<PracticeSettings>({
    ...currentSettings,
  });
  const [isOpen, setIsOpen] = useState(false);

  const update = <K extends keyof PracticeSettings>(
    key: K,
    value: PracticeSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors flex items-center gap-2"
      >
        <span>⚙</span>
        <span>Settings</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-100">
              Practice Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 text-lg"
            >
              ×
            </button>
          </div>

          {/* Mythbuster callout */}
          <div className="mb-4 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/30">
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              <span className="font-bold">Card counting = bet sizing, not play strategy.</span>{" "}
              Basic strategy stays almost always the same. The count tells you{" "}
              <span className="text-amber-300">how much to bet</span> — raise bets when the True Count is positive, bet minimum when it&apos;s negative.
            </p>
          </div>

          {/* Game Mode */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("mode", opt.value)}
                  className={`p-2 rounded-lg text-left transition-colors ${
                    settings.mode === opt.value
                      ? "bg-amber-600/20 border border-amber-500/50 text-amber-200"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Deck Count */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Decks: {settings.deckCount}
            </label>
            <input
              type="range"
              min={1}
              max={8}
              value={settings.deckCount}
              onChange={(e) => update("deckCount", Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>1</span>
              <span>2</span>
              <span>4</span>
              <span>6</span>
              <span>8</span>
            </div>
          </div>

          {/* Table Rules */}
          <div className="mb-4 space-y-2">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Table Rules
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hitSoft17}
                onChange={(e) => update("hitSoft17", e.target.checked)}
                className="accent-amber-500"
              />
              <span>Dealer hits soft 17 (H17)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowLateSurrender}
                onChange={(e) =>
                  update("allowLateSurrender", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Late surrender</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowDoubleAfterSplit}
                onChange={(e) =>
                  update("allowDoubleAfterSplit", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Double after split (DAS)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowResplitAces}
                onChange={(e) =>
                  update("allowResplitAces", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Resplit aces (RSA)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.checkDeviations}
                onChange={(e) =>
                  update("checkDeviations", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Check deviations</span>
            </label>
          </div>

          {/* Blackjack Payout */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Blackjack Payout
            </label>
            <div className="flex gap-2">
              {(["3:2", "6:5"] as const).map((payout) => (
                <button
                  key={payout}
                  onClick={() => update("blackjackPayout", payout)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    settings.blackjackPayout === payout
                      ? "bg-amber-600/20 border border-amber-500/50 text-amber-200"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {payout}
                </button>
              ))}
            </div>
          </div>

          {/* Penetration */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Penetration: {Math.round(settings.penetration * 100)}%
            </label>
            <input
              type="range"
              min={0.5}
              max={0.9}
              step={0.05}
              value={settings.penetration}
              onChange={(e) =>
                update("penetration", Number(e.target.value))
              }
              className="w-full accent-amber-500"
            />
          </div>

          {/* Table */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Table
            </label>

            {/* Table size */}
            <label className="block text-xs text-zinc-500 mb-1">
              Players: {settings.tableSize}
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={settings.tableSize}
              onChange={(e) =>
                update("tableSize", Number(e.target.value))
              }
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>

            {/* Seat position */}
            {settings.tableSize > 1 && (
              <div className="mt-3">
                <label className="block text-xs text-zinc-500 mb-1">
                  Seat position
                </label>
                <div className="flex gap-2">
                  {SEAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update("seatPosition", opt.value)}
                      className={`flex-1 p-2 rounded-lg text-left transition-colors ${
                        settings.seatPosition === opt.value
                          ? "bg-amber-600/20 border border-amber-500/50 text-amber-200"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-medium">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Table limits */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Table Limits
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-500 mb-1">Min</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={settings.tableMin}
                  onChange={(e) =>
                    update("tableMin", Math.max(100, Number(e.target.value) || 100))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-500 mb-1">Max</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={settings.tableMax}
                  onChange={(e) =>
                    update("tableMax", Math.max(1000, Number(e.target.value) || 1000))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200"
                />
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="mb-4 space-y-2">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Display
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hideDecksRemainingText}
                onChange={(e) =>
                  update("hideDecksRemainingText", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Hide decks remaining text</span>
            </label>
            <p className="text-[10px] text-zinc-600">
              Forces you to visually estimate the discard tray.
            </p>
          </div>

          {/* Betting */}
          <div className="mb-4">
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Betting
            </label>

            {/* Unit size */}
            <label className="block text-xs text-zinc-500 mb-1">
              Unit size (1 unit = ...)
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={settings.unitSize}
              onChange={(e) =>
                update("unitSize", Math.max(100, Number(e.target.value) || 100))
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 mb-3"
            />

            {/* Spread table */}
            <label className="block text-xs text-zinc-500 mb-1">
              Bet spread (units by true count)
            </label>
            <div className="space-y-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((tc) => (
                <div
                  key={tc}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-400 w-16">
                    {tc === 1 ? "≤ 1" : tc === 5 ? "5+" : `TC ${tc}`}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.betSpreadUnits[tc] ?? 1}
                    onChange={(e) =>
                      update("betSpreadUnits", {
                        ...settings.betSpreadUnits,
                        [tc]: Math.max(
                          1,
                          Math.round(Number(e.target.value) || 1)
                        ),
                      })
                    }
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-200 text-right"
                  />
                  <span className="text-zinc-600 text-xs w-10">units</span>
                </div>
              ))}
            </div>

            {/* Hide suggested bet */}
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hideSuggestedBet}
                onChange={(e) => update("hideSuggestedBet", e.target.checked)}
                className="accent-amber-500"
              />
              <span>Hide suggested bet until clicked</span>
            </label>
            <p className="text-[10px] text-zinc-600 mt-1">
              Forces you to calculate your own bet from the count first.
            </p>

            {/* Active count verification */}
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={settings.activeCountVerification}
                onChange={(e) =>
                  update("activeCountVerification", e.target.checked)
                }
                className="accent-amber-500"
              />
              <span>Active count verification</span>
            </label>
            <p className="text-[10px] text-zinc-600 mt-1">
              After each deal, type the true count before you can act.
            </p>
          </div>

          {/* Apply */}
          <button
            onClick={() => {
              onApply(settings);
              setIsOpen(false);
            }}
            className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
          >
            Apply & Restart
          </button>
        </div>
      )}
    </div>
  );
}
