"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { getLocalPlayerId } from "@/lib/guest";
import PlayerPosition from "./PlayerPosition";
import CardComponent from "./CardComponent";
import TableLayoutToggle from "@/components/TableLayoutToggle";
import PokerInvitePanel from "@/components/poker/online/PokerInvitePanel";
import { useTableLayout } from "@/hooks/useTableLayout";

export default function GameBoard() {
  const {
    players,
    phase,
    dealerCards,
    dealerTotal,
    focusedPlayerId,
    allowedActions,
    roomName,
    roomId,
    joinToken,
    hostUserId,
    resultOverlay,
    error,
    placeBet,
    playerAction,
    startGame,
  } = useGameStore();
  const user = useAuthStore((s) => s.user);
  const { isLandscape } = useTableLayout();

  const [betInput, setBetInput] = useState(100);
  const [showInvite, setShowInvite] = useState(false);

  const myId = getLocalPlayerId(user?.id);
  const localPlayer = players.find((p) => p.userId === myId);
  const isHost = hostUserId === myId;
  const isMyTurn = focusedPlayerId === myId && phase === "playing";
  const isBetting = phase === "betting" || phase === "waiting";

  // Arrange players: local player at bottom, others around
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.userId === myId) return 1;
    if (b.userId === myId) return -1;
    return a.seatPosition - b.seatPosition;
  });

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-between min-h-0 ${
        isLandscape ? "p-1 md:p-2" : "p-2 md:p-4"
      }`}
    >
      {/* Room header */}
      <div className="w-full flex items-center justify-between mb-2 gap-2 relative">
        <h2
          className={`font-bold text-zinc-100 truncate ${
            isLandscape ? "text-base" : "text-lg"
          }`}
        >
          {roomName}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {roomId && (
            <button
              onClick={() => setShowInvite((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                showInvite ? "bg-sky-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              Invite
            </button>
          )}
          <TableLayoutToggle />
          {isHost && phase === "waiting" && (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              title={
                players.length < 2
                  ? "Blackjack needs at least 2 players — share the room link"
                  : undefined
              }
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:hover:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {players.length < 2 ? "Waiting for players (1/2)" : "Start Game"}
            </button>
          )}
        </div>
        {showInvite && roomId && (
          <div className="absolute right-0 top-full mt-2 w-[320px] max-w-[calc(100vw-24px)] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50">
            <PokerInvitePanel roomId={roomId} linkStyle="game" joinToken={joinToken ?? undefined} />
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className={`relative w-full flex-1 min-h-0 ${
          isLandscape ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        {/* Felt table */}
        <div
          className={`absolute inset-0 bg-felt shadow-2xl border-4 border-amber-900/60 overflow-hidden pointer-events-none ${
            isLandscape ? "rounded-2xl" : "rounded-3xl"
          }`}
        >
          <div className="absolute inset-0 felt-texture pointer-events-none" />
          <div className="absolute inset-4 rounded-2xl border border-amber-800/20 pointer-events-none" />
        </div>

        {/* Dealer area - top */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-0 pointer-events-none">
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Dealer</span>
          <div className="flex items-end pointer-events-none">
            {dealerCards.map((card, i) => (
              <CardComponent key={card.id} card={card} index={i} />
            ))}
          </div>
          {dealerTotal !== null && dealerTotal > 0 && (
            <span className="text-sm font-bold text-zinc-300 bg-zinc-900/60 px-2 py-0.5 rounded">
              {dealerTotal}
            </span>
          )}
        </div>

        {/* Other players - sides */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
          {sortedPlayers
            .filter((p) => p.userId !== myId)
            .slice(0, 2)
            .map((p) => (
              <div key={p.userId} className="mb-4">
                <PlayerPosition
                  player={p}
                  isActive={focusedPlayerId === p.userId}
                  isLocal={false}
                  seatIndex={p.seatPosition}
                />
              </div>
            ))}
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
          {sortedPlayers
            .filter((p) => p.userId !== myId)
            .slice(2, 4)
            .map((p) => (
              <div key={p.userId} className="mb-4">
                <PlayerPosition
                  player={p}
                  isActive={focusedPlayerId === p.userId}
                  isLocal={false}
                  seatIndex={p.seatPosition}
                />
              </div>
            ))}
        </div>

        {/* Local player - bottom center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
          {localPlayer ? (
            <PlayerPosition
              player={localPlayer}
              isActive={focusedPlayerId === localPlayer.userId}
              isLocal
              seatIndex={localPlayer.seatPosition}
            />
          ) : (
            <div className="text-zinc-400 text-sm">Not seated</div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="w-full max-w-3xl mt-2">
        {/* Betting UI */}
        {isBetting && localPlayer && (
          <div className="flex items-center justify-center gap-3 p-3 bg-zinc-900/80 rounded-xl">
            <span className="text-zinc-400 text-sm">Bet:</span>
            <input
              type="number"
              value={betInput}
              onChange={(e) => setBetInput(Math.max(0, Number(e.target.value)))}
              className="w-24 px-2 py-1 rounded bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none text-center"
              min={100}
              step={100}
            />
            <div className="flex gap-1">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetInput(amt)}
                  className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs transition-colors"
                >
                  {amt}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                placeBet(betInput);
                setBetInput(100);
              }}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
            >
              Place Bet
            </button>
          </div>
        )}

        {/* Action buttons */}
        {isMyTurn && (
          <div className="flex items-center justify-center gap-2 p-3 bg-zinc-900/80 rounded-xl">
            <span className="text-amber-400 text-sm font-medium mr-2">Your turn</span>
            {allowedActions.includes("hit") && (
              <button
                onClick={() => playerAction("hit")}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
              >
                Hit
              </button>
            )}
            {allowedActions.includes("stand") && (
              <button
                onClick={() => playerAction("stand")}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
              >
                Stand
              </button>
            )}
            {allowedActions.includes("double") && (
              <button
                onClick={() => playerAction("double")}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
              >
                Double
              </button>
            )}
            {allowedActions.includes("split") && (
              <button
                onClick={() => playerAction("split")}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors"
              >
                Split
              </button>
            )}
            {allowedActions.includes("surrender") && (
              <button
                onClick={() => playerAction("surrender")}
                className="px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-sm transition-colors"
              >
                Surrender
              </button>
            )}
          </div>
        )}

        {/* Waiting messages */}
        {phase === "waiting" && !isHost && (
          <div className="text-center text-zinc-400 text-sm py-2">
            Waiting for host to start the game...
          </div>
        )}
        {phase === "playing" && !isMyTurn && localPlayer && (
          <div className="text-center text-zinc-400 text-sm py-2">
            Waiting for other players...
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-900/90 border border-red-500/50 text-red-100 text-sm shadow-lg">
          {error}
        </div>
      )}

      {/* Result overlay */}
      {resultOverlay && (        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center animate-result-pop">
            <div
              className={`text-3xl font-bold mb-2 ${
                resultOverlay.result === "win"
                  ? "text-green-400"
                  : resultOverlay.result === "push"
                    ? "text-zinc-300"
                    : "text-red-400"
              }`}
            >
              {resultOverlay.result === "win"
                ? "YOU WIN!"
                : resultOverlay.result === "push"
                  ? "PUSH"
                  : "YOU LOSE"}
            </div>
            <div className="text-zinc-400 text-lg">
              {resultOverlay.payout > 0 ? "+" : ""}
              {resultOverlay.payout.toLocaleString()} chips
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
