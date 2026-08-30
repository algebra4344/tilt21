"use client";

import React, { useEffect, useMemo } from "react";
import usePokerTrainer from "@/hooks/usePokerTrainer";
import PokerPlayerSeat from "./PokerPlayerSeat";
import PokerPotDisplay from "./PokerPotDisplay";
import PokerActionPanel from "./PokerActionPanel";
import PokerActionLog from "./PokerActionLog";
import PokerSessionStats from "./PokerSessionStats";
import PokerSettingsPanel from "./PokerSettingsPanel";
import PokerBoard from "./PokerBoard";
import { formatMoney } from "@/lib/poker/types";
import { computeSeatPositions } from "./PokerTableOval";
import TableLayoutToggle from "@/components/TableLayoutToggle";
import { useTableLayout } from "@/hooks/useTableLayout";

const SEAT_ACTIONS: Record<string, string> = {
  f: "fold",
  c: "call",
  r: "raise",
};

export default function PokerTrainerBoard() {
  const game = usePokerTrainer();
  const { isLandscape } = useTableLayout();
  const playerCount = game.settings.playerCount;
  const heroIndex = playerCount - 3;
  const seatPositions = useMemo(
    () => computeSeatPositions(playerCount, heroIndex, isLandscape),
    [playerCount, heroIndex, isLandscape],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (game.phase === "idle") game.startSession();
        else if (game.phase === "showdown" && game.result) game.nextHand();
        return;
      }
      if (game.phase !== "human") return;
      const action = SEAT_ACTIONS[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        game.act(action as "fold" | "call" | "raise");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game]);

  const table = game.table;
  const playing = table !== null;
  const humanTurn = game.phase === "human";
  const showdownReveal = game.phase === "showdown";
  const showOpponentEquity = game.settings.showOpponentEquity;
  const showEquity =
    showOpponentEquity && game.equity !== null && (game.phase === "betting" || humanTurn || game.phase === "showdown");

  // Sequential card reveal during showdown
  const [revealIndex, setRevealIndex] = React.useState(-1);
  const revealOrder = useMemo(() => {
    if (!showdownReveal || !table) return [];
    return table.seats.filter((s) => !s.folded).map((s) => s.seatIndex);
  }, [showdownReveal, table]);

  React.useEffect(() => {
    if (!showdownReveal || revealOrder.length === 0) return;
    const timeouts = revealOrder.map((_, i) =>
      setTimeout(() => setRevealIndex(i), 400 + i * 500)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [showdownReveal, revealOrder]);

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (game.phase === "idle") game.startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [, setLastActionsVersion] = React.useState(0);
  const [lastActions, setLastActions] = React.useState<Map<number, string>>(new Map());
  useEffect(() => {
    const check = () => {
      setLastActionsVersion(game.lastActionsVersionRef.current);
      setLastActions(new Map(game.lastActionsRef.current));
    };
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, [game.lastActionsRef, game.lastActionsVersionRef]);

  const renderSeat = (seatIndex: number) => {
    const seat = table!.seats[seatIndex];
    const seatEquity = showEquity
      ? game.equity?.find((e) => e.seatIndex === seatIndex)?.pct ?? null
      : null;
    const isHero = seatIndex === heroIndex;
    const isInRevealOrder = revealOrder.indexOf(seatIndex);
    const isRevealed = showdownReveal && isInRevealOrder !== -1 && isInRevealOrder <= revealIndex;
    const cardReveal = isRevealed || (game.settings.showOpponentCards && !isHero);
    let lastAct = lastActions.get(seatIndex);
    if (isHero && humanTurn) lastAct = "YOUR TURN";
    return (
      <PokerPlayerSeat
        key={`seat-${seatIndex}`}
        seat={seat}
        streetBet={table!.streetBets[seatIndex]}
        reveal={cardReveal}
        active={humanTurn ? seatIndex === heroIndex : seat.isActive}
        winner={game.result?.winnerIndex === seatIndex}
        equity={seatEquity}
        lastAction={lastAct}
        flip={seatIndex === heroIndex}
        hideHud={isHero}
      />
    );
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 h-dvh max-h-dvh relative w-full overflow-hidden ${
        isLandscape ? "p-0.5 md:p-1" : "p-1 md:p-2"
      }`}
    >
      {/* Top bar */}
      <div
        className={`w-full flex items-center justify-between gap-3 flex-wrap ${
          isLandscape ? "mb-1" : "mb-3"
        }`}
      >
        <PokerSessionStats
          stats={game.stats}
          handsPlayed={game.session.handsPlayed}
          handsPerSession={game.settings.handsPerSession}
          handNumber={game.handNumber}
        />
        <div className="flex items-center gap-2">
          {table && !isLandscape && (
            <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Blinds</span>
              <span className="text-sm font-mono font-bold text-amber-400">
                {formatMoney(table.smallBlind)}/{formatMoney(table.bigBlind)}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs uppercase tracking-wider text-zinc-500">Stack</span>
              <span className="text-sm font-mono font-bold text-zinc-200">
                {formatMoney(table.seats[0]?.stack ?? 0)}
              </span>
            </div>
          )}
          <TableLayoutToggle />
          <PokerSettingsPanel
            settings={game.settings}
            onUpdate={game.updateSettings}
            onResetStats={game.resetStats}
            onLeave={game.closeSummary}
          />
        </div>
      </div>

      <div className="flex-1 flex min-h-0 gap-2">
        {/* Hand history — own column on wide screens, never over seats */}
        <aside className="hidden xl:flex w-64 shrink-0 flex-col justify-end pb-2">
          {playing && (
            <PokerActionLog
              actionLogRef={game.actionLogRef}
              actionLogVersionRef={game.actionLogVersionRef}
            />
          )}
        </aside>
        <div className="relative flex-1 min-w-0 min-h-0 max-w-6xl mx-auto w-full">
          {/* Felt table (oblong oval) */}
          <div
            className={
              isLandscape
                ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[82%] max-h-full w-auto max-w-[94%] aspect-[2/1] rounded-[50%] bg-felt shadow-[0_0_0_3px_#8B6914,0_0_0_7px_#5C4A0F,0_0_0_9px_#3d2b1f,0_0_30px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden"
                : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] aspect-[16/9] rounded-[50%] bg-felt shadow-[0_0_0_3px_#8B6914,0_0_0_7px_#5C4A0F,0_0_0_9px_#3d2b1f,0_0_30px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.3)] overflow-hidden"
            }
          >
            <div className="absolute inset-0 felt-texture" />
            <div className="absolute inset-5 rounded-[50%] border border-amber-800/15" />
          </div>

          {/* Center: board + pot */}
          {playing && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 ${
                isLandscape ? "top-[42%]" : "top-[38%]"
              }`}
            >
              <PokerBoard board={table.board} street={table.street} />
              <PokerPotDisplay table={table} />
            </div>
          )}

          {/* Showdown indicator — above the board */}
          {game.result && game.phase === "showdown" && table && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 text-center pointer-events-none ${
                isLandscape ? "top-[12%]" : "top-[18%]"
              }`}
            >
              <div className={`text-sm font-bold uppercase tracking-wider ${game.result.humanWon ? "text-green-400" : "text-zinc-400"}`}>
                {game.result.humanWon ? "You win!" : `${table.seats[game.result.winnerIndex]?.name ?? "Player"} wins`}
              </div>
              <div className="text-amber-400 font-mono font-bold text-xl mt-1">
                +{formatMoney(game.result.amount)}
              </div>
              {game.result.handName && (
                <div className="text-xs text-zinc-500 mt-0.5">{game.result.handName}</div>
              )}
            </div>
          )}

          {/* Seats around the oval */}
          {playing && Object.keys(seatPositions).map((key) => {
            const seatIndex = Number(key);
            const pos = seatPositions[seatIndex];
            return (
              <div
                key={`seat-pos-${seatIndex}`}
                className="absolute z-10"
                style={{ top: pos.top, left: pos.left, transform: pos.transform }}
              >
                {renderSeat(seatIndex)}
              </div>
            );
          })}


          {/* History toggle + drawer — small screens only */}
          {playing && (
            <>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className={`absolute bottom-2 left-2 z-40 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  historyOpen
                    ? "bg-zinc-700 text-zinc-200"
                    : "bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                📜 History
              </button>
              {historyOpen && (
                <div className="absolute bottom-14 left-2 z-40 shadow-2xl">
                  <PokerActionLog
                    actionLogRef={game.actionLogRef}
                    actionLogVersionRef={game.actionLogVersionRef}
                  />
                </div>
              )}
            </>
          )}

          {/* Action panel — bottom-center, overlapping felt */}
          {playing && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-50 w-full max-w-[460px] px-2 ${
                isLandscape ? "bottom-0" : "bottom-2"
              }`}
            >
              {game.handInfo && humanTurn && (game.handInfo.heroStack ?? 0) > 0 && (
                <PokerActionPanel
                  handInfo={game.handInfo}
                  disabled={!humanTurn}
                  onAct={game.act}
                />
              )}
              {game.phase === "dealing" && (
                <div className="min-h-[36px] flex items-center justify-center text-sm text-zinc-500">
                  Dealing...
                </div>
              )}
              {game.phase === "betting" && (
                <div className="min-h-[36px] flex items-center justify-center text-sm text-zinc-500">
                  Players are acting...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary modal */}
      {game.showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 animate-result-pop">
            <div className="text-2xl font-bold text-amber-400">SESSION COMPLETE</div>
            <h2 className="text-xl font-bold text-zinc-100">Session Complete</h2>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Hands played</span>
                <span className="text-zinc-200">{game.session.handsPlayed}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pots won</span>
                <span className="text-amber-400">{game.session.handsWon}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Net</span>
                <span className={game.session.netProfit >= 0 ? "text-green-400" : "text-red-400"}>
                  {game.session.netProfit >= 0 ? "+" : ""}{formatMoney(game.session.netProfit)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Best streak</span>
                <span className="text-zinc-200">{game.stats.bestStreak}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={game.closeSummary}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-b from-zinc-600 to-zinc-800 border-t border-zinc-500/30 hover:from-zinc-500 hover:to-zinc-700 text-zinc-300 text-sm transition-all shadow-md active:translate-y-0.5"
              >
                Close
              </button>
              <button
                onClick={game.startSession}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-b from-green-500 to-green-700 border-t border-green-400/30 hover:from-green-400 hover:to-green-600 text-white text-sm font-semibold transition-all shadow-md shadow-green-900/50 active:translate-y-0.5"
              >
                New Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}