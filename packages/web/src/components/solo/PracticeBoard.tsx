"use client";

import { useState, useEffect, useRef } from "react";
import { useSoloGame } from "@/hooks/useSoloGame";
import useIsNarrowViewport from "@/hooks/useIsNarrowViewport";
import { useTableLayout } from "@/hooks/useTableLayout";
import TableLayoutToggle from "@/components/TableLayoutToggle";
import type { PracticeSettings } from "@/hooks/useSoloGame";
import SoloCardComponent from "./SoloCardComponent";
import CountDisplay from "./CountDisplay";
import CompactCountStrip from "./CompactCountStrip";
import SessionStatsDisplay from "./SessionStats";
import CorrectionToast from "./CorrectionToast";
import PracticeSettingsPanel from "./PracticeSettings";
import CountPrompt from "./CountPrompt";
import QuickControls from "./QuickControls";
import { HandHistoryToggle, HandHistorySidebar, buildHandEvent, type HandEvent } from "./HandHistory";

type PracticeBoardProps = {
  initialSettings?: Partial<PracticeSettings>;
};

const CHIP_MULTIPLIERS = [1, 2, 5, 10, 25];

const ACTION_KEYS: Record<string, string> = {
  h: "hit",
  s: "stand",
  d: "double",
  p: "split",
  r: "surrender",
};

export default function PracticeBoard({
  initialSettings,
}: PracticeBoardProps) {
  const game = useSoloGame(initialSettings);
  const [betInput, setBetInput] = useState("");
  const [handHistory, setHandHistory] = useState<HandEvent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );
  const handNumberRef = useRef(0);
  const isNarrowViewport = useIsNarrowViewport();
  const { isLandscape } = useTableLayout();
  const [expandedSeats, setExpandedSeats] = useState<Set<number>>(new Set());

  // Phones can't fit 6+ card fans: NPCs collapse to tappable badges.
  // Landscape reclaims width — keep full seats when wide enough.
  const compactSeats =
    isNarrowViewport && !isLandscape && game.settings.tableSize >= 6;

  const toggleSeat = (seatIdx: number) =>
    setExpandedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatIdx)) next.delete(seatIdx);
      else next.add(seatIdx);
      return next;
    });

  // Fit-to-width: shrink the whole seat row if it would overflow the felt
  // (guarantees the human seat is never clipped on narrow screens).
  const seatsWrapRef = useRef<HTMLDivElement>(null);
  const seatsRowRef = useRef<HTMLDivElement>(null);
  const [seatScale, setSeatScale] = useState(1);
  useEffect(() => {
    const measure = () => {
      const wrap = seatsWrapRef.current;
      const row = seatsRowRef.current;
      if (!wrap || !row) return;
      const avail = wrap.clientWidth;
      const need = row.scrollWidth;
      setSeatScale(need > avail && need > 0 ? Math.max(0.55, avail / need) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (seatsWrapRef.current) ro.observe(seatsWrapRef.current);
    if (seatsRowRef.current) ro.observe(seatsRowRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [game.settings.tableSize, compactSeats]);

  const handleApplySettings = (settings: PracticeSettings) => {
    game.updateSettings(settings);
    game.startNewGame(settings);
  };

  const balance = game.playerState?.balance ?? 100000;
  const unitSize = game.settings.unitSize;
  const suggestedBet = game.getSuggestedBet(game.trueCount);
  const suggestedUnits = game.getSuggestedUnits(game.trueCount);
  const isIdleOrResults =
    game.gameStep === "idle" || game.gameStep === "results";
  const betTooHigh = game.currentBet > balance * 0.8;

  // Capture hand results for the history sidebar.
  const prevStepRef = useRef(game.gameStep);
  useEffect(() => {
    if (game.gameStep === "results" && prevStepRef.current !== "results" && game.playerState) {
      handNumberRef.current += 1;
      const ev = buildHandEvent(
        handNumberRef.current,
        game.playerState.handWinner,
        game.currentBet,
        game.trueCount,
      );
      setHandHistory((prev) => [...prev, ev]);
    }
    prevStepRef.current = game.gameStep;
  }, [game.gameStep, game.playerState, game.currentBet, game.trueCount]);

  // Keyboard shortcuts (H/S/D/P/R + Space).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (game.countPromptActive) {
          // Space submits the count prompt via its own input handler;
          // if the input is focused this won't fire. Otherwise, no-op.
          return;
        }
        if (game.gameStep === "idle" || game.gameStep === "results") {
          if (game.gameStep === "idle") game.startNewGame();
          else game.dealNextHand();
        }
        return;
      }

      if (game.gameStep !== "playing" || game.countPromptActive) return;

      const action = ACTION_KEYS[e.key.toLowerCase()];
      if (action && game.allowedActions.includes(action)) {
        game.playerAction(action);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game]);

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 relative max-w-5xl mx-auto w-full ${
        isLandscape ? "p-1 md:p-2" : "p-2 md:p-4"
      }`}
    >
      {/* Top bar: stats + settings */}
      <div
        className={`w-full flex items-center justify-between gap-3 flex-wrap ${
          isLandscape ? "mb-1" : "mb-3"
        }`}
      >
        <SessionStatsDisplay stats={game.sessionStats} allTime={game.allTimeStats} onReset={game.resetStats} />
        <div className="flex items-center gap-2">
          <TableLayoutToggle />
          <HandHistoryToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <PracticeSettingsPanel
            currentSettings={game.settings}
            onApply={handleApplySettings}
          />
        </div>
      </div>

      {/* Quick controls — hide in landscape to free vertical space */}
      {!isLandscape && (
        <QuickControls settings={game.settings} onApply={handleApplySettings} />
      )}

      {/* Main area: felt + sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Game table */}
        <div className="relative flex-1 min-w-0 min-h-0">
        {/* Felt table */}
        <div
          className={`absolute inset-0 bg-felt shadow-2xl border-4 border-amber-900/60 overflow-hidden ${
            isLandscape ? "rounded-2xl" : "rounded-3xl"
          }`}
        >
          <div className="absolute inset-0 felt-texture" />
          <div className="absolute inset-4 rounded-2xl border border-amber-800/20" />
        </div>

        {/* Table info placard */}
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="bg-zinc-900/80 border border-amber-800/40 rounded-lg px-3 py-1.5 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">
              {game.settings.deckCount}D · {game.settings.tableSize}P
            </div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
              Table Limits
            </div>
            <div className="text-xs font-mono text-amber-400">
              {game.settings.tableMin >= 1000
                ? `${game.settings.tableMin / 1000}k`
                : game.settings.tableMin.toLocaleString()}
              {" / "}
              {game.settings.tableMax >= 1000
                ? `${game.settings.tableMax / 1000}k`
                : game.settings.tableMax.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Count: compact corner strip on phones / landscape (full panel would
            cover cards on a short felt), full centered panel on tall desktop */}
        {isNarrowViewport || isLandscape ? (
          <CompactCountStrip
            runningCount={game.runningCount}
            trueCount={game.trueCount}
            decksRemaining={game.decksRemaining}
          />
        ) : (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <CountDisplay
              runningCount={game.runningCount}
              trueCount={game.trueCount}
              penetration={game.penetration}
              cardsRemaining={game.cardsRemaining}
              decksRemaining={game.decksRemaining}
              totalCards={game.totalCards}
              deckCount={game.settings.deckCount}
              hideDecksRemainingText={game.settings.hideDecksRemainingText}
            />
          </div>
        )}

        {/* Dealer area - top */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            Dealer
          </span>
          <div className="flex items-end">
            {game.dealerCards.map((card, i) => {
              const isHoleCard = i === 0 && game.dealerCards.length > 1;
              const hideHoleCard = isHoleCard && (game.gameStep === "playing" || game.gameStep === "insurance");
              return (
                <SoloCardComponent
                  key={card.id}
                  card={hideHoleCard ? { ...card, showingFace: false } : card}
                  index={i}
                  delay={0}
                  popValue={game.cardPops[card.id]}
                />
              );
            })}
          </div>
          {game.dealerTotal !== null && game.dealerTotal > 0 && game.gameStep !== "playing" && game.gameStep !== "insurance" && (
            <span className="text-sm font-bold text-zinc-300 bg-zinc-900/60 px-2 py-0.5 rounded">
              {game.dealerTotal}
            </span>
          )}
        </div>

        {/* Player seats — bottom arc (all players left to right) */}
        {(() => {
          const tableSize = game.settings.tableSize;
          const seatPosition = game.settings.seatPosition;
          // Human screen seat index: third_base = 0 (far left), first_base = N-1 (far right)
          const humanSeatIdx = seatPosition === "first_base" ? tableSize - 1 : 0;

          // Build NPC lookup by screen seat index.
          const npcBySeat = new Map<number, (typeof game.npcHands)[number]>();
          for (const npc of game.npcHands) {
            // NPC seatIndex from core: right-side NPCs count down from N-1, left-side count up from 0.
            // Map to screen position: third_base human at 0, NPCs fill 1..N-1.
            // first_base human at N-1, NPCs fill 0..N-2.
            let screenSeat: number;
            if (seatPosition === "third_base") {
              // NPCs in playersRight occupy seats 1,2,...,N-1 (right side of human)
              screenSeat = npc.seatIndex + 1;
            } else {
              // NPCs in playersLeft occupy seats 0,1,...,N-2 (left of human)
              screenSeat = npc.seatIndex;
            }
            npcBySeat.set(screenSeat, npc);
          }

          const seats = Array.from({ length: tableSize }, (_, i) => {
            if (i === humanSeatIdx) {
              return { kind: "human" as const, seatIdx: i };
            }
            return { kind: "npc" as const, seatIdx: i, npc: npcBySeat.get(i) };
          });

          // Arc Y offset: center seats dip lower, edge seats are higher.
          const arcOffset = (seatIdx: number) => {
            if (tableSize <= 1) return 0;
            const t = (seatIdx / (tableSize - 1)) * Math.PI; // 0 → π
            return Math.sin(t) * 35; // max 35px dip at center
          };

          return (
            <div ref={seatsWrapRef} className="absolute bottom-4 left-0 right-0 z-10">
              <div
                ref={seatsRowRef}
                className="flex justify-center gap-2 px-2 sm:gap-6 sm:px-8 w-max min-w-full mx-auto"
                style={
                  seatScale < 1
                    ? { transform: `scale(${seatScale})`, transformOrigin: "bottom center" }
                    : undefined
                }
              >
              {seats.map((seat) => {
                const yOff = arcOffset(seat.seatIdx);
                if (seat.kind === "human") {
                  const hands = game.playerState?.hands ?? [];
                  return (
                    <div
                      key={`seat-${seat.seatIdx}`}
                      style={{ transform: `translateY(${yOff}px)` }}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                        You
                      </span>
                      {hands.map((hand, i) => (
                        <div
                          key={i}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            i === game.focusedHandIndex
                              ? "bg-amber-900/30 border border-amber-500/30"
                              : "bg-zinc-900/20 border border-transparent"
                          }`}
                        >
                          {hands.length > 1 && (
                            <span className="text-[10px] text-zinc-500 uppercase">
                              Hand {i + 1}
                            </span>
                          )}
                          <div className="flex items-end">
                            {hand.cards.map((card, j) => (
                              <SoloCardComponent
                                key={card.id}
                                card={card}
                                index={j}
                                small={hands.length > 1}
                                delay={0}
                                popValue={game.cardPops[card.id]}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                hand.busted
                                  ? "text-red-400"
                                  : hand.blackjack
                                    ? "text-amber-400"
                                    : "text-zinc-200"
                              }`}
                            >
                              {hand.cardTotal}
                              {hand.busted && " BUST"}
                              {hand.blackjack && " BJ!"}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {hand.betAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                      {game.playerState && (
                        <div className="text-[10px] text-zinc-400">
                          Bal:{" "}
                          <span className="text-zinc-200 font-mono">
                            {game.playerState.balance.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // NPC seat
                const npc = seat.npc;
                if (!npc) return null;
                // Compact tappable badge on phones with 6+ players — tap to
                // expand the full card fan, tap again to collapse.
                if (compactSeats) {
                  const expanded = expandedSeats.has(seat.seatIdx);
                  return (
                    <button
                      key={`seat-${seat.seatIdx}`}
                      type="button"
                      onClick={() => toggleSeat(seat.seatIdx)}
                      aria-expanded={expanded}
                      title={expanded ? "Tap to collapse" : "Tap to show cards"}
                      style={{ transform: `translateY(${yOff}px)` }}
                      className="flex flex-col items-center gap-1 rounded-xl bg-zinc-900/80 border border-zinc-500/50 px-2.5 py-1.5 min-h-[44px] active:bg-zinc-800/70 transition-colors"
                    >
                      {expanded ? (
                        <>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                            CPU {seat.seatIdx + 1}
                          </span>
                          <div className="flex items-end">
                            {npc.cards.map((card, j) => (
                              <SoloCardComponent
                                key={card.id}
                                card={card}
                                index={j}
                                small
                                delay={0}
                                popValue={game.cardPops[card.id]}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                            CPU {seat.seatIdx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-zinc-300">
                              {npc.cardTotal}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {npc.betAmount >= 1000
                                ? `${npc.betAmount / 1000}k`
                                : npc.betAmount}
                            </span>
                            <span className="text-[9px] text-zinc-600">
                              🂠{npc.cards.length}
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                  );
                }
                return (
                  <div
                    key={`seat-${seat.seatIdx}`}
                    style={{ transform: `translateY(${yOff}px)` }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                      CPU {seat.seatIdx + 1}
                    </span>
                    <div className="flex items-end">
                      {npc.cards.map((card, j) => (
                        <SoloCardComponent
                          key={card.id}
                          card={card}
                          index={j}
                          small
                          delay={0}
                          popValue={game.cardPops[card.id]}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-zinc-300">
                        {npc.cardTotal}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {npc.betAmount >= 1000
                          ? `${npc.betAmount / 1000}k`
                          : npc.betAmount}
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          );
        })()}

        {/* Count verification prompt */}
        <CountPrompt
          key={game.countPromptActive ? "prompt-active" : "prompt-inactive"}
          active={game.countPromptActive}
          feedback={game.countPromptFeedback}
          runningCount={game.runningCount}
          trueCount={game.trueCount}
          decksRemaining={game.decksRemaining}
          onSubmit={game.submitCountGuess}
        />
      </div>

      {/* Hand history sidebar */}
      <HandHistorySidebar events={handHistory} isOpen={sidebarOpen} />
      </div>

      {/* Action bar */}
      <div className="w-full max-w-4xl mt-2">
        {/* Correction toast */}
        <CorrectionToast
          key={game.correction?.timestamp ?? "none"}
          correction={game.correction}
        />

        {/* Start / New Game / Bet selector */}
        {isIdleOrResults && (
          <div className="flex flex-col gap-2 p-3 bg-zinc-900/80 rounded-xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-amber-400 text-sm font-medium">
                {game.gameStep === "idle" ? "Place your bet" : "Next bet"}
              </span>

              <div className="flex items-center gap-1.5">
                {CHIP_MULTIPLIERS.map((m) => {
                  const amount = m * unitSize;
                  const outOfRange =
                    amount < game.settings.tableMin ||
                    amount > game.settings.tableMax;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        game.setBet(amount);
                        setBetInput(String(amount));
                      }}
                      disabled={outOfRange}
                      className={`w-14 h-11 sm:h-9 rounded-full font-mono text-xs font-semibold transition-colors ${
                        game.currentBet === amount
                          ? "bg-amber-500 text-zinc-900 ring-2 ring-amber-300"
                          : outOfRange
                            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                            : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                      }`}
                    >
                      {amount >= 1000
                        ? `${amount / 1000}k`
                        : amount.toLocaleString()}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={unitSize}
                  step={100}
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  placeholder={String(game.currentBet)}
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 text-right"
                />
                <button
                  onClick={() => {
                    const amount = Number(betInput);
                    if (Number.isFinite(amount) && amount > 0) {
                      game.setBet(amount);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Suggested bet */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500">
                Current:{" "}
                <span className="text-zinc-200 font-mono">
                  {game.currentBet.toLocaleString()}
                </span>{" "}
                · TC {game.trueCount.toFixed(1)}
              </span>

              {game.suggestedBetRevealed ? (
                <span className="text-green-400 font-mono text-sm">
                  Suggested: {suggestedBet.toLocaleString()} ({suggestedUnits}u)
                </span>
              ) : game.settings.hideSuggestedBet ? (
                <button
                  onClick={game.revealSuggestedBet}
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-medium transition-colors"
                >
                  Reveal suggested bet
                </button>
              ) : (
                <span className="text-green-400 font-mono text-sm">
                  Suggested: {suggestedBet.toLocaleString()} ({suggestedUnits}u)
                </span>
              )}
            </div>

            {betTooHigh && (
              <p className="text-amber-400 text-xs">
                Warning: betting this high may prevent you from Doubling or
                Splitting.
              </p>
            )}

            <button
              onClick={() => {
                if (game.gameStep === "idle") {
                  game.startNewGame();
                } else {
                  game.dealNextHand();
                }
              }}
              className="w-full py-3 sm:py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
            >
              {game.gameStep === "idle" ? "Deal First Hand" : "Deal Next Hand"}
            </button>
          </div>
        )}

        {/* Insurance prompt */}
        {game.waitingForInsurance && (
          <div className="flex items-center justify-center gap-3 p-3 bg-zinc-900/80 rounded-xl">
            <span className="text-amber-400 text-sm font-medium mr-2">
              Insurance?
            </span>
            <button
              onClick={() => game.playerAction("no-insurance")}
              className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
            >
              No
            </button>
            <button
              onClick={() => game.playerAction("insurance")}
              className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
            >
              Yes
            </button>
          </div>
        )}

        {/* Action buttons */}
        {game.gameStep === "playing" && (
          <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900/80 rounded-xl flex-wrap">
            <span className="text-amber-400 text-sm font-medium mr-2">
              Your turn
            </span>
            {game.allowedActions.includes("hit") && (
              <button
                onClick={() => game.playerAction("hit")}
                disabled={game.countPromptActive}
                className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hit <span className="text-[10px] opacity-60 ml-1">H</span>
              </button>
            )}
            {game.allowedActions.includes("stand") && (
              <button
                onClick={() => game.playerAction("stand")}
                disabled={game.countPromptActive}
                className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stand <span className="text-[10px] opacity-60 ml-1">S</span>
              </button>
            )}
            {game.allowedActions.includes("double") && (
              <button
                onClick={() => game.playerAction("double")}
                disabled={game.countPromptActive}
                className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Double <span className="text-[10px] opacity-60 ml-1">D</span>
              </button>
            )}
            {game.allowedActions.includes("split") && (
              <button
                onClick={() => game.playerAction("split")}
                disabled={game.countPromptActive}
                className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Split <span className="text-[10px] opacity-60 ml-1">P</span>
              </button>
            )}
            {game.allowedActions.includes("surrender") && (
              <button
                onClick={() => game.playerAction("surrender")}
                disabled={game.countPromptActive}
                className="px-4 py-2 min-h-11 sm:min-h-9 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Surrender <span className="text-[10px] opacity-60 ml-1">R</span>
              </button>
            )}
          </div>
        )}

        {/* Dealer playing */}
        {game.gameStep === "dealer" && (
          <div className="text-center text-zinc-400 text-sm py-2">
            Dealer is playing...
          </div>
        )}
      </div>
    </div>
  );
}
