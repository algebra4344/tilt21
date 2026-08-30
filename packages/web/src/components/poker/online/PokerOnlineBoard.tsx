"use client";

import { useEffect, useRef, useState } from "react";
import { usePokerStore } from "@/stores/pokerStore";
import { getGuestIdentity, identityColor } from "@/lib/guest";
import type { SeatState } from "@/lib/poker/types";
import type { PokerRoomStatePayload } from "@/stores/pokerTypes";
import { classifyContext, getRaiseSize, handString } from "@/lib/poker/engine";
import { formatMoney } from "@/lib/poker/types";
import PokerPlayerSeat from "../PokerPlayerSeat";
import PokerBoard from "../PokerBoard";
import PokerPotDisplay from "../PokerPotDisplay";
import PokerActionPanel from "../PokerActionPanel";
import PokerActionLogView from "../PokerActionLogView";
import PokerTableOval from "../PokerTableOval";
import PokerInvitePanel from "./PokerInvitePanel";
import JoinInterstitial from "../JoinInterstitial";
import PokerCreateTable from "./PokerCreateTable";
import TableLayoutToggle from "@/components/TableLayoutToggle";
import { useTableLayout } from "@/hooks/useTableLayout";

function useRoomIdFromUrl(): string | null {
  return useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id")
      : null
  )[0];
}

function deriveHandInfo(
  table: NonNullable<PokerRoomStatePayload["table"]>,
  seatIndex: number,
): import("@/lib/poker/types").HandInfo {
  const seat = table.seats[seatIndex];
  const toCall = Math.max(0, table.currentBet - table.streetBets[seatIndex]);
  const context =
    table.street === "preflop"
      ? classifyContext(table.currentBet, table.bigBlind)
      : toCall > 0
        ? "vs-raise"
        : "open";
  return {
    street: table.street,
    position: seat.position,
    hand: handString(seat.holeCards),
    context,
    toCall,
    raiseAmount: getRaiseSize(table.bigBlind, table.currentBet, context, table.street, table.pot),
    minRaise: table.minRaise > 0 ? table.minRaise : table.bigBlind,
    equity: null,
    bigBlind: table.bigBlind,
    pot: table.pot,
    heroStack: seat.stack,
    currentBet: table.currentBet,
  };
}

function MiniChat() {
  const messages = usePokerStore((s) => s.messages);
  const sendChat = usePokerStore((s) => s.sendChat);
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
      <span className="px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
        Table chat
      </span>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-0.5">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.type === "system" ? "text-zinc-600 italic" : "text-zinc-300"}`}>
            {msg.type === "system" ? (
              msg.text
            ) : (
              <>
                <span className="font-semibold text-zinc-200">{msg.username}: </span>
                {msg.text}
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 p-2 border-t border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text) return;
          sendChat(text.slice(0, 200));
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          maxLength={200}
          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm text-white transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function PokerOnlineBoard() {
  const urlRoomId = useRoomIdFromUrl();
  const guestId = getGuestIdentity().guestId;
  const joinRequested = useRef(false);

  const roomId = usePokerStore((s) => s.roomId);
  const roomName = usePokerStore((s) => s.roomName);
  const hostSeatIndex = usePokerStore((s) => s.hostSeatIndex);
  const status = usePokerStore((s) => s.status);
  const seats = usePokerStore((s) => s.seats);
  const youPending = usePokerStore((s) => s.youPending);
  const settings = usePokerStore((s) => s.settings);
  const handsPlayed = usePokerStore((s) => s.handsPlayed);
  const table = usePokerStore((s) => s.table);
  const youSeatIndex = usePokerStore((s) => s.youSeatIndex);
  const toActSeatIndex = usePokerStore((s) => s.toActSeatIndex);
  const lastResult = usePokerStore((s) => s.lastResult);
  const actionLog = usePokerStore((s) => s.actionLog);
  const error = usePokerStore((s) => s.error);

  const preview = usePokerStore((s) => s.preview);
  const guestName = usePokerStore((s) => s.guestName);
  const previewTable = usePokerStore((s) => s.previewTable);
  const joinTable = usePokerStore((s) => s.joinTable);
  const leaveTable = usePokerStore((s) => s.leaveTable);
  const kickSeat = usePokerStore((s) => s.kickSeat);
  const rebuy = usePokerStore((s) => s.rebuy);
  const startGame = usePokerStore((s) => s.startGame);
  const act = usePokerStore((s) => s.act);

  const [confirmKickSeat, setConfirmKickSeat] = useState<number | null>(null);
  const [rebuyAmount, setRebuyAmount] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const { isLandscape } = useTableLayout();

  // Confetti key changes each time a hand is settled, remounting the burst.
  const confettiKey = lastResult ? `hand-${handsPlayed}` : "none";

  useEffect(() => {
    usePokerStore.getState().hydrateGuest();
  }, []);

  useEffect(() => {
    if (urlRoomId && !roomId && !joinRequested.current) {
      joinRequested.current = true;
      previewTable(urlRoomId);
    }
  }, [urlRoomId, roomId, previewTable]);

  if (!roomId) {
    if (urlRoomId || preview) {
      const p = preview?.state ?? null;
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <JoinInterstitial
            key={guestName}
            kind="online"
            title={preview?.found ? p?.name ?? "" : ""}
            seatedCount={p ? p.seats.filter(Boolean).length : null}
            capacity={p?.settings.maxPlayers ?? null}
            status={p?.status ?? null}
            defaultName={guestName}
            notFound={preview !== null && !preview.found}
            onSit={(name) => {
              if (urlRoomId) joinTable(urlRoomId, name);
            }}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <PokerCreateTable />
      </div>
    );
  }

  const isHost = hostSeatIndex !== null && hostSeatIndex === youSeatIndex;
  const showdown = lastResult !== null && status === "playing";
  const seatCount = settings?.maxPlayers ?? Math.max(seats.length, 6);

  const renderSeat = (i: number) => {
    const roomSeat = seats[i];
    const tSeat: SeatState | undefined = table?.seats[i];

    if (!roomSeat && !tSeat) {
      return (
        <div className="w-28 flex justify-center">
          <span className="text-[11px] text-zinc-600 border border-dashed border-zinc-800 rounded-lg px-2 py-1.5">
            Open seat
          </span>
        </div>
      );
    }

    const isHero = youSeatIndex === i;

    const seatView: SeatState = tSeat ?? {
      seatIndex: i,
      position: "UTG",
      name: "",
      holeCards: [],
      stack: roomSeat?.stack ?? 0,
      totalCommitted: 0,
      folded: false,
      isHuman: false,
      isDealer: false,
      isActive: false,
      playerId: isHero ? guestId : null,
    };

    const displayName = roomSeat?.name ?? seatView.name;

    return (
      <div className="relative">
        <PokerPlayerSeat
          seat={{ ...seatView, name: displayName || seatView.name, isHuman: isHero }}
          streetBet={table?.streetBets[i] ?? 0}
          reveal={showdown || isHero}
          active={toActSeatIndex === i && !table?.handComplete}
          winner={lastResult ? lastResult.awards.some((a) => a.seatIndex === i && a.amount > 0) : false}
          equity={null}
          flip={isHero}
          hideHud={isHero}
        />
        {isHost && roomSeat && !isHero && (
          <button
            onClick={() => {
              if (confirmKickSeat === i) {
                setConfirmKickSeat(null);
                kickSeat(i);
              } else {
                setConfirmKickSeat(i);
                setTimeout(() => setConfirmKickSeat(null), 3000);
              }
            }}
            title="Remove player"
            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold transition-all ${
              confirmKickSeat === i
                ? "bg-red-600 text-white scale-110"
                : "bg-zinc-800/90 text-zinc-500 hover:bg-red-600 hover:text-white opacity-60 hover:opacity-100"
            }`}
          >
            {confirmKickSeat === i ? "Sure?" : "✕"}
          </button>
        )}
      </div>
    );
  };

  let center = null;
  if (status === "playing" && table) {
    center = (
      <>
        <PokerBoard board={table.board} street={table.street} />
        <PokerPotDisplay table={table} />
      </>
    );
  } else {
    center = (
      <div className="text-center space-y-1 pointer-events-none">
        <div className="text-2xl font-bold text-emerald-400 tracking-widest">HOLD&apos;EM</div>
        {status === "lobby" ? (
          <p className="text-zinc-400 text-sm">
            {isHost
              ? "Start the game — bots fill empty seats"
              : "Waiting for the host to start…"}
          </p>
        ) : (
          <p className="text-zinc-400 text-sm">Game over</p>
        )}
      </div>
    );
  }

  const banner =
    showdown && lastResult && lastResult.awards.filter((a) => a.amount > 0).length > 0 ? (
      <div className="pointer-events-none">
        <div className="text-lg font-black text-green-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          {lastResult.awards.filter(a => a.amount > 0).map(a =>
            `${a.name} +${formatMoney(a.amount)}${a.handName ? ` (${a.handName})` : ''}`
          ).join(" & ")}
        </div>
        <div className="text-amber-400 font-mono font-bold text-xl mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          {formatMoney(lastResult.potTotal)}
        </div>
      </div>
    ) : status === "playing" && table && !table.handComplete && toActSeatIndex !== null ? (
      <div className="text-xs uppercase tracking-widest text-sky-300 font-mono pointer-events-none">
        Waiting on {seats[toActSeatIndex]?.name ?? "…"}
      </div>
    ) : null;

  return (
    <div
      className={`flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden h-dvh`}
    >
      {lastResult && <PokerOnlineWinFlash key={confettiKey} />}
      <header
        className={`border-b border-zinc-800 flex items-center justify-between gap-2 relative z-40 ${
          isLandscape ? "px-2 sm:px-3 py-1.5" : "px-3 sm:px-4 py-2.5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h1
            className={`font-bold truncate ${
              isLandscape ? "text-sm" : "text-base sm:text-lg"
            }`}
          >
            {roomName || "Poker table"}
          </h1>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${
              status === "playing"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {status === "playing" ? `#${handsPlayed + 1}` : "Lobby"}
          </span>
          {settings && (
            <span className="text-xs text-zinc-500 font-mono hidden md:inline">
              {formatMoney(settings.smallBlind)}/{formatMoney(settings.bigBlind)} ·{" "}
              {seats.filter(Boolean).length}/{settings.maxPlayers}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isHost && status === "lobby" && (
            <button
              onClick={startGame}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-sm font-bold shadow-md shadow-emerald-900/40 transition-all active:translate-y-0.5"
            >
              ▶ Start
            </button>
          )}
          <TableLayoutToggle />
          <button
            onClick={() => setShowInvite((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              showInvite ? "bg-sky-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            Invite
          </button>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: identityColor(guestId) }}
            />
            {guestName}
          </span>
          <button
            onClick={leaveTable}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
          >
            Leave
          </button>
        </div>

        {showInvite && (
          <div className="absolute right-3 top-full mt-2 w-[320px] max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50">
            <PokerInvitePanel roomId={roomId} />
          </div>
        )}
      </header>

      {error && (
        <div className="mx-auto mt-2 w-fit px-4 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm z-30">
          {error}
        </div>
      )}

      {youPending && youSeatIndex === null && (
        <div
          data-testid="pending-seat-banner"
          className="mx-auto mt-2 w-fit px-4 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 text-sm z-30"
        >
          Table is mid-hand — you&apos;re in line and will be dealt in next hand.
        </div>
      )}

      <main
        className={`flex-1 flex min-h-0 gap-3 ${
          isLandscape ? "p-1.5 sm:p-2" : "p-3 sm:p-4"
        }`}
      >
        <section className="relative flex-1 min-w-0 max-w-6xl mx-auto">
          <PokerTableOval
            seatCount={seatCount}
            heroIndex={youSeatIndex ?? -1}
            renderSeat={renderSeat}
            center={center}
            banner={banner}
            landscape={isLandscape}
          />

          {/* Action panel overlays the felt bottom — trainer style */}
          {status === "playing" && table && youSeatIndex !== null && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-50 w-full max-w-[560px] px-2 ${
                isLandscape ? "bottom-0 sm:bottom-1" : "bottom-1 sm:bottom-3"
              }`}
            >
              {(() => {
                const mySeat = seats[youSeatIndex];
                const tSeat = table.seats[youSeatIndex];

                // Busted: explicit rebuy instead of silent top-up.
                if (mySeat && mySeat.stack <= 0) {
                  const def = settings?.startingStack ?? 200;
                  return (
                    <div className="bg-zinc-900/95 border border-red-500/40 rounded-xl p-3 flex items-center gap-2 justify-center flex-wrap shadow-xl">
                      <span className="text-sm text-red-300 font-semibold">
                        💀 Busted — you&apos;re sitting out.
                      </span>
                      <input
                        type="number"
                        min={1}
                        placeholder={`${def}`}
                        value={rebuyAmount}
                        onChange={(e) => setRebuyAmount(e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
                      />
                      <button
                        onClick={() => {
                          const amt = Number(rebuyAmount) || def;
                          rebuy(amt);
                          setRebuyAmount("");
                        }}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                      >
                        Rebuy ${Number(rebuyAmount) || def}
                      </button>
                    </div>
                  );
                }

                if (
                  toActSeatIndex === youSeatIndex &&
                  !table.handComplete &&
                  !tSeat.folded &&
                  tSeat.stack > 0
                ) {
                  return (
                    <PokerActionPanel
                      handInfo={deriveHandInfo(table, youSeatIndex)}
                      disabled={false}
                      onAct={(action, amount) => act(action, amount)}
                    />
                  );
                }

                const sitting = mySeat?.sittingOut;
                return (
                  <div className="text-center text-sm text-zinc-500 bg-zinc-950/70 rounded-lg py-1.5">
                    {table.handComplete
                      ? "Dealing next hand…"
                      : sitting
                        ? "Sitting out — rebuy to play the next hand."
                        : "Waiting…"}
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        <aside
          className={`flex-col gap-3 w-[280px] shrink-0 min-h-0 ${
            isLandscape ? "hidden" : "hidden lg:flex"
          }`}
        >
          {actionLog.length > 0 && (
            <div className="h-[200px] shrink-0">
              <PokerActionLogView entries={actionLog} height="h-full" />
            </div>
          )}
          <MiniChat />
        </aside>
      </main>

      {!isLandscape && (
        <details className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur border-t border-zinc-800">
          <summary className="px-4 py-2 text-xs uppercase tracking-wider text-zinc-400 cursor-pointer select-none">
            💬 Table chat
          </summary>
          <div className="h-[38vh] px-2 pb-2">
            <MiniChat />
          </div>
        </details>
      )}
    </div>
  );
}

function PokerOnlineWinFlash() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 bg-emerald-500/10 animate-pulse"
      style={{ animationDuration: "1.2s", animationIterationCount: 1 }}
    />
  );
}

const unusedTypeGuard: PokerRoomStatePayload | null = null;
void unusedTypeGuard;
