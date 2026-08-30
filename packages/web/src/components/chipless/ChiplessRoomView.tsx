"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useHomeStore } from "@/stores/homeStore";
import { identityColor } from "@/lib/guest";
import { formatMoney } from "@/lib/poker/types";
import { useClientMounted } from "@/hooks/useClientMounted";
import { ChiplessThemeProvider, useChiplessTheme, useChiplessThemeValue } from "@/lib/chiplessTheme";
import ChiplessCreateTable from "./ChiplessCreateTable";
import ChiplessActionBar from "./ChiplessActionBar";
import ChiplessHostBar from "./ChiplessHostBar";
import HomeSettlementModal from "../poker/home/HomeSettlementModal";
import PokerInvitePanel from "../poker/online/PokerInvitePanel";
import PokerActionLogView from "../poker/PokerActionLogView";
import type { HomePlayerView } from "@/stores/homeTypes";

/* ── Theme toggle ── */
function ThemeToggle() {
  const { theme, toggle: toggleTheme } = useChiplessThemeValue();
  return (
    <button
      onClick={toggleTheme}
      title={theme === "light" ? "Dark mode" : "Light mode"}
      className="w-9 h-9 rounded-xl ch-btn-ghost flex items-center justify-center text-base transition-colors shrink-0"
    >
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

/* ── Mini chat ── */
function ChatPanel() {
  const messages = useHomeStore((s) => s.messages);
  const sendChat = useHomeStore((s) => s.sendChat);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full ch-card rounded-xl overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-[var(--ch-border)] bg-[var(--ch-surface-2)]">
        <span className="text-[10px] uppercase tracking-widest ch-muted font-bold">Table Talk</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-0.5 min-h-[80px]">
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.type === "system" ? "ch-muted italic" : ""}`}>
            {msg.type === "system" ? msg.text : (
              <>
                <span className="font-semibold">{msg.username}: </span>
                {msg.text}
              </>
            )}
          </div>
        ))}
        <div ref={ref} />
      </div>
      <form
        className="flex gap-1.5 p-2 border-t border-[var(--ch-border)]"
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
          className="flex-1 px-3 py-1.5 rounded-lg ch-input text-sm"
        />
        <button type="submit" className="px-3 rounded-lg bg-[var(--ch-accent)] hover:opacity-90 text-white text-sm font-bold transition-opacity">→</button>
      </form>
    </div>
  );
}

/* ── Player seat card ── */
function SeatCard({
  seat,
  isYou,
  isHost,
  isDealer,
  isToAct,
  streetBet,
  folded,
  inHand,
  wonAmount,
}: {
  seat: NonNullable<HomePlayerView>;
  isYou: boolean;
  isHost: boolean;
  isDealer: boolean;
  isToAct: boolean;
  streetBet: number;
  folded: boolean;
  inHand: boolean;
  wonAmount: number | undefined;
}) {
  const dimmed = seat.fullyOut || seat.sittingOut || folded;
  const cardCls = wonAmount
    ? "ch-won"
    : isToAct && !dimmed
      ? "ch-card ch-toact"
      : dimmed
        ? "ch-card opacity-40"
        : "ch-card";

  return (
    <div className={`relative rounded-2xl p-4 transition-all duration-300 ${cardCls}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 ${
            isYou ? "ring-2 ring-[var(--ch-gold)] ring-offset-2 ring-offset-[var(--ch-surface)]" : ""
          }`}
          style={{ backgroundColor: identityColor(seat.name) }}
        >
          {seat.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold truncate">{seat.name}</span>
            {isHost && <span className="text-xs">👑</span>}
            {isDealer && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--ch-text)] text-[var(--ch-bg)] font-black tracking-wide">D</span>
            )}
          </div>
          <div className="text-[11px] ch-muted leading-tight">
            {folded ? "folded" : seat.fullyOut ? "cashed out" : seat.sittingOut ? "sitting out" : "\u00A0"}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-[10px] uppercase tracking-wider ch-muted font-bold">Stack</span>
        <span className={`text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight ${dimmed ? "ch-muted" : "ch-gold"}`}>
          {formatMoney(seat.stack)}
        </span>
      </div>

      {streetBet > 0 && !folded && inHand && (
        <div className="mt-1.5 flex justify-end">
          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold ch-gold bg-[var(--ch-surface-2)] border border-[var(--ch-border)] rounded-full px-2.5 py-0.5">
            {formatMoney(streetBet)}
          </span>
        </div>
      )}

      {wonAmount !== undefined && wonAmount > 0 && (
        <div className="mt-2 text-center">
          <span className="inline-block px-3 py-1 rounded-full ch-accent font-black">
            +{formatMoney(wonAmount)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ChiplessRoomView() {
  const [theme, toggleTheme] = useChiplessTheme();
  return (
    <ChiplessThemeProvider value={{ theme, toggle: toggleTheme }}>
      <ChiplessRoomViewInner />
    </ChiplessThemeProvider>
  );
}

function ChiplessRoomViewInner() {
  const [urlRoomId] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("id")
      : null
  );
  // SSR renders the same placeholder the client starts with, so the
  // post-mount store state (room joined mid-navigation) can't desync hydration.
  const mounted = useClientMounted();

  const joinRequested = useRef(false);

  const roomId = useHomeStore((s) => s.roomId);
  const roomName = useHomeStore((s) => s.roomName);
  const hostSeatIndex = useHomeStore((s) => s.hostSeatIndex);
  const status = useHomeStore((s) => s.status);
  const seats = useHomeStore((s) => s.seats);
  const handsPlayed = useHomeStore((s) => s.handsPlayed);
  const table = useHomeStore((s) => s.table);
  const youSeatIndex = useHomeStore((s) => s.youSeatIndex);
  const toActSeatIndex = useHomeStore((s) => s.toActSeatIndex);
  const lastAward = useHomeStore((s) => s.lastAward);
  const actionLog = useHomeStore((s) => s.actionLog);
  const error = useHomeStore((s) => s.error);

  const preview = useHomeStore((s) => s.preview);
  const previewTable = useHomeStore((s) => s.previewTable);
  const joinTable = useHomeStore((s) => s.joinTable);
  const leaveTable = useHomeStore((s) => s.leaveTable);

  const [showInvite, setShowInvite] = useState(false);
  const [showPanel, setShowPanel] = useState<"chat" | "history" | null>(null);

  useEffect(() => {
    useHomeStore.getState().hydrateGuest();
  }, []);

  useEffect(() => {
    if (urlRoomId && !roomId) {
      previewTable(urlRoomId);
    }
  }, [urlRoomId, roomId, previewTable]);

  useEffect(() => {
    if (urlRoomId && !roomId && preview?.found && !joinRequested.current) {
      joinRequested.current = true;
      joinTable(urlRoomId);
    }
  }, [urlRoomId, roomId, preview, joinTable]);

  if (!mounted) {
    return <div className="min-h-screen ch-page" />;
  }

  if (!roomId) {
    if (urlRoomId) {
      const p = preview?.state ?? null;
      return (
        <div className="min-h-screen ch-page flex items-center justify-center p-4">
          <div className="w-full max-w-md mx-auto ch-card rounded-2xl p-6 text-center space-y-3">
            {preview === null ? (
              <p className="text-lg font-bold ch-text">Looking for the table…</p>
            ) : preview.found ? (
              <>
                <h2 className="text-2xl font-black">{p?.name ?? ""}</h2>
                <p className="text-sm ch-muted">
                  {p?.seats.filter(Boolean).length ?? 0}/{p?.settings.maxPlayers ?? "?"} seated ·{" "}
                  {p?.status === "playing" ? "in progress" : p?.status === "ended" ? "over" : "waiting"}
                </p>
                <button
                  onClick={() => urlRoomId && joinTable(urlRoomId)}
                  disabled={!!p?.seats && p.seats.filter(Boolean).length >= (p?.settings.maxPlayers ?? 0)}
                  className="w-full py-4 rounded-2xl bg-[var(--ch-accent)] disabled:opacity-40 text-white font-black text-lg shadow-lg active:scale-95 transition-all"
                >
                  Take my seat →
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Table not found</h2>
                <Link href="/" className="inline-block px-5 py-2.5 rounded-xl ch-btn-ghost font-semibold">Back</Link>
              </>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen ch-page flex items-center justify-center p-4">
        <ChiplessCreateTable />
      </div>
    );
  }

  const isHost = hostSeatIndex !== null && hostSeatIndex === youSeatIndex;
  const you = youSeatIndex !== null ? seats[youSeatIndex] : null;
  const pot = table?.pot ?? 0;
  const currentBet = table?.currentBet ?? 0;
  const seated = seats.filter(Boolean) as NonNullable<HomePlayerView>[];
  const winnerMap = new Map(lastAward?.awards.map((a) => [a.seatIndex, a.amount]) ?? []);
  const awardTotal = lastAward?.awards.reduce((sum, a) => sum + a.amount, 0) ?? 0;
  const showConfetti = awardTotal > 0;

  return (
    <div className="h-dvh flex flex-col ch-page overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed top-[28%] left-1/2 -translate-x-1/2 z-50 pointer-events-none text-center animate-pulse">
          <div className="text-5xl font-black ch-accent" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            +{formatMoney(awardTotal)}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[var(--ch-border)] px-3 sm:px-5 py-3 flex items-center justify-between gap-2 relative z-40">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-black truncate tracking-tight">{roomName || "Game night"}</h1>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 bg-[var(--ch-surface-2)] ${
            status === "playing" ? "ch-accent"
            : status === "ended" ? "text-[var(--ch-danger)]"
            : "ch-muted"
          }`}>
            {status === "playing" ? `HAND #${handsPlayed}` : status === "ended" ? "ENDED" : "LOBBY"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setShowInvite(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              showInvite ? "bg-[var(--ch-accent)] text-white" : "ch-btn-ghost"
            }`}
          >
            Invite
          </button>
          <button onClick={leaveTable} className="px-2.5 py-1.5 rounded-xl ch-btn-ghost ch-muted text-xs transition-colors">
            Leave
          </button>
        </div>
        {showInvite && (
          <div className="absolute right-3 top-full mt-2 w-[300px] max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50">
            <PokerInvitePanel roomId={roomId} path="poker/chipless" />
          </div>
        )}
      </header>

      {error && (
        <div className="mx-auto mt-2 w-fit px-4 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-[var(--ch-danger)] text-sm z-30">
          {error}
        </div>
      )}

      {/* Host bar */}
      {isHost && status !== "ended" && (
        <div className="px-3 sm:px-5 pt-2.5 pb-0">
          <ChiplessHostBar />
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto px-3 sm:px-5 pt-4 pb-36 space-y-5">

          {/* Pot hero */}
          <div className="relative rounded-3xl ch-hero px-5 py-5 text-center">
            <div className="relative">
              <span className="text-[11px] uppercase tracking-[0.25em] ch-accent font-bold">Pot</span>
              <div className="text-6xl font-black font-mono ch-gold tracking-tight leading-none mt-1 mb-2">
                {formatMoney(pot)}
              </div>
              {currentBet > 0 && (
                <span className="inline-block text-sm font-mono font-bold ch-accent bg-[var(--ch-surface-2)] border border-[var(--ch-border)] rounded-full px-4 py-1">
                  To call {formatMoney(currentBet)}
                </span>
              )}
              {!table && (
                <span className="block ch-muted text-sm mt-2">
                  {status === "lobby" ? "Share the link to start playing 👆" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seated.length > 0 ? seated.map(seat => {
              const tSeat = table?.seats[seat.seatIndex];
              const won = winnerMap.get(seat.seatIndex);
              return (
                <div key={seat.seatIndex} className="group relative">
                  <SeatCard
                    seat={seat}
                    isYou={seat.seatIndex === youSeatIndex}
                    isHost={seat.seatIndex === hostSeatIndex}
                    isDealer={table?.dealerIndex === seat.seatIndex}
                    isToAct={toActSeatIndex === seat.seatIndex && !table?.handComplete}
                    streetBet={table?.streetBets[seat.seatIndex] ?? 0}
                    folded={!!tSeat?.folded}
                    inHand={!!table && !table.handComplete}
                    wonAmount={won}
                  />
                </div>
              );
            }) : (
              <div className="col-span-full text-center ch-muted py-12 space-y-2">
                <div className="text-4xl">📱</div>
                <p className="text-sm">Waiting for your crew… share the link!</p>
              </div>
            )}
          </div>
        </main>

        {/* Desktop rail: history + chat (in-flow, never overlaps) */}
        <aside className="hidden xl:flex flex-col gap-3 w-[280px] shrink-0 min-h-0 py-4 pr-4">
          {actionLog.length > 0 && (
            <div className="h-[200px] shrink-0">
              <PokerActionLogView entries={actionLog} height="h-full" tone="light" />
            </div>
          )}
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </aside>
      </div>

      {/* Mobile drawers */}
      {showPanel && (
        <div className="fixed inset-x-3 bottom-[17rem] z-40 xl:hidden max-h-[42vh] overflow-y-auto shadow-2xl rounded-xl">
          {showPanel === "history" && actionLog.length > 0 && (
            <PokerActionLogView entries={actionLog} height="max-h-[38vh]" tone="light" />
          )}
          {showPanel === "chat" && <ChatPanel />}
        </div>
      )}

      {/* Mobile floating buttons */}
      {status !== "ended" && (
        <div className="fixed right-3 bottom-40 z-40 flex flex-col gap-2 xl:hidden">
          <button
            onClick={() => setShowPanel(showPanel === "history" ? null : "history")}
            className={`w-11 h-11 rounded-full text-base font-bold shadow-lg transition-colors ${
              showPanel === "history" ? "bg-[var(--ch-accent)] text-white" : "ch-card"
            }`}
          >📜</button>
          <button
            onClick={() => setShowPanel(showPanel === "chat" ? null : "chat")}
            className={`w-11 h-11 rounded-full text-base font-bold shadow-lg transition-colors ${
              showPanel === "chat" ? "bg-[var(--ch-accent)] text-white" : "ch-card"
            }`}
          >💬</button>
        </div>
      )}

      {/* Sticky action bar */}
      {you && status !== "ended" && (
        <div className="fixed bottom-0 inset-x-0 z-40 ch-bar backdrop-blur-md border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto">
            <ChiplessActionBar seat={you} />
          </div>
        </div>
      )}

      <HomeSettlementModal />
    </div>
  );
}
