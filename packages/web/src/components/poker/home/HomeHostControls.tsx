"use client";

import { useState } from "react";
import { useHomeStore } from "@/stores/homeStore";
import type { HomePlayerView } from "@/stores/homeTypes";
import { formatMoney } from "@/lib/poker/types";

export default function HomeHostControls() {
  const seats = useHomeStore((s) => s.seats);
  const table = useHomeStore((s) => s.table);
  const status = useHomeStore((s) => s.status);
  const bettingClosed = useHomeStore((s) => s.bettingClosed);
  const startHand = useHomeStore((s) => s.startHand);
  const nextStreet = useHomeStore((s) => s.nextStreet);
  const award = useHomeStore((s) => s.award);
  const buyIn = useHomeStore((s) => s.buyIn);
  const cashOut = useHomeStore((s) => s.cashOut);
  const endNight = useHomeStore((s) => s.endNight);

  // Award sheet state: places[0] is the champion group, later taps either join
  // the current group (chop) or, after "add runner-up", a new placement group.
  const [showAward, setShowAward] = useState(false);
  const [places, setPlaces] = useState<number[][]>([[]]);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const activeSeats = seats.filter(
    (s): s is NonNullable<HomePlayerView> =>
      s !== null && !s.fullyOut && !seatFolded(s.seatIndex),
  );

  function seatFolded(seatIndex: number): boolean {
    return table?.seats[seatIndex]?.folded ?? true;
  }

  function toggleSeat(seatIndex: number) {
    setPlaces((prev) => {
      const copy = prev.map((g) => [...g]);
      const last = copy[copy.length - 1];
      if (last.includes(seatIndex)) return prev;
      last.push(seatIndex);
      return copy;
    });
  }

  const liveWinner =
    table && !table.handComplete
      ? (() => {
          const live = table.seats.filter((s) => !s.folded);
          return live.length === 1 ? live[0] : null;
        })()
      : null;

  if (status === "ended") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {(status === "lobby" || (table?.handComplete ?? false)) && (
          <button
            onClick={startHand}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40 transition-all active:translate-y-0.5"
          >
            Deal next hand
          </button>
        )}

        {status === "playing" && table && !table.handComplete && (
          <>
            {liveWinner && (
              <button
                onClick={() => award([[liveWinner.seatIndex]])}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold shadow-md shadow-green-900/40 transition-all active:translate-y-0.5"
              >
                {liveWinner.name} wins
              </button>
            )}
            {!liveWinner && (
              <button
                onClick={() => {
                  setPlaces([[]]);
                  setShowAward(true);
                }}
                disabled={table.street !== "river" && !bettingClosed}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-green-900/40 transition-all active:translate-y-0.5"
              >
                Declare winners
              </button>
            )}
            <button
              onClick={nextStreet}
              disabled={table.street === "river"}
              title={
                bettingClosed
                  ? "Betting closed — deal the next street"
                  : "You can deal early if the table is ready"
              }
              className={`px-5 py-2.5 rounded-xl text-white font-bold transition-all active:translate-y-0.5 ${
                bettingClosed
                  ? "bg-gradient-to-b from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 shadow-md shadow-sky-900/40 animate-pulse"
                  : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              {bettingClosed ? "✓ Betting closed — " : ""}
              Deal{" "}
              {table.street === "preflop"
                ? "Flop"
                : table.street === "flop"
                  ? "Turn"
                  : table.street === "turn"
                    ? "River"
                    : "…"}
            </button>
          </>
        )}

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
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            confirmEnd
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700"
          }`}
        >
          {confirmEnd ? "Tap again to end night" : "End night"}
        </button>
      </div>

      {showAward && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-lg font-bold">Declare winners</h3>
            <p className="text-sm text-zinc-400">
              Tap players in finish order. Tapping multiple names in the same group chops that
              place.
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSeats.map((seat) => {
                const pickedPlace = places.findIndex((g) => g.includes(seat.seatIndex));
                return (
                  <button
                    key={seat.seatIndex}
                    onClick={() => toggleSeat(seat.seatIndex)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      pickedPlace === -1
                        ? "border-zinc-700 bg-zinc-800 hover:border-emerald-500"
                        : "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                    }`}
                  >
                    {seat.name}
                    {pickedPlace >= 0 &&
                      (places.length > 1 || places[0].length > 1) &&
                      ` (#${pickedPlace + 1})`}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPlaces((prev) => [...prev, []])}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700"
              >
                + Add runner-up place
              </button>
              <button
                onClick={() => setPlaces([[]])}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300"
              >
                Reset
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowAward(false)}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const valid = places.filter((g) => g.length > 0).map((g) => [...g]);
                  if (valid.length === 0) return;
                  award(valid);
                  setShowAward(false);
                  setPlaces([[]]);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold"
              >
                Award pot
              </button>
            </div>
          </div>
        </div>
      )}

      <LedgerPanel
        onBuyIn={(amount, seatIndex) => buyIn(amount, seatIndex)}
        onCashOut={(amount, seatIndex) => cashOut(amount, seatIndex)}
      />
    </div>
  );
}

function LedgerPanel({
  onBuyIn,
  onCashOut,
}: {
  onBuyIn: (amount: number, seatIndex?: number) => void;
  onCashOut: (amount: number, seatIndex?: number) => void;
}) {
  const seats = useHomeStore((s) => s.seats);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState<number | "">("");

  return (
    <div className="text-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {open ? "Hide ledger" : "Buy-ins & cash-outs"}
      </button>
      {open && (
        <div className="mt-2 mx-auto max-w-md bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 space-y-2">
          <div className="flex gap-2 items-center justify-center flex-wrap">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
            >
              <option value="">Pick player…</option>
              {seats.map(
                (s) =>
                  s && (
                    <option key={s.seatIndex} value={s.seatIndex}>
                      {s.name} ({formatMoney(s.stack)})
                    </option>
                  ),
              )}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
            />
            <button
              disabled={target === "" || !amount}
              onClick={() => {
                onBuyIn(Number(amount), target as number);
                setAmount("");
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold"
            >
              Buy in
            </button>
            <button
              disabled={target === "" || !amount}
              onClick={() => {
                onCashOut(Number(amount), target as number);
                setAmount("");
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-bold"
            >
              Cash out
            </button>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 space-y-0.5">
            {seats.map(
              (s) =>
                s && (
                  <div key={s.seatIndex}>
                    {s.name}: in {formatMoney(s.boughtIn)} · out {formatMoney(s.cashedOut)} · chips{" "}
                    {formatMoney(s.stack)}
                  </div>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
