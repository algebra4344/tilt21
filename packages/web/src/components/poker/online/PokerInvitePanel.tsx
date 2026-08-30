"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function PokerInvitePanel({
  roomId,
  path = "poker/online",
  linkStyle = "query",
  joinToken,
}: {
  roomId: string;
  path?: string;
  /** `query` → /path?id=room · `game` → /game/roomId */
  linkStyle?: "query" | "game";
  joinToken?: string;
}) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base =
      linkStyle === "game"
        ? `${window.location.origin}/game/${roomId}`
        : `${window.location.origin}/${path}?id=${roomId}`;
    if (!joinToken) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}token=${encodeURIComponent(joinToken)}`;
  }, [roomId, path, linkStyle, joinToken]);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http); user can select the text manually.
    }
  };

  const share = async () => {
    if (!canShare) return;
    try {
      await navigator.share({
        title: "Join my table",
        text: "Jump in — same link, same room.",
        url,
      });
    } catch {
      // User cancelled or share failed.
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
      <span className="text-xs uppercase tracking-wider text-zinc-500">Invite your friends</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 truncate">
          {url || "…"}
        </code>
        {canShare && (
          <button
            onClick={share}
            className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors shrink-0"
          >
            Share
          </button>
        )}
        <button
          onClick={copy}
          className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors shrink-0"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        onClick={() => setShowQr((v) => !v)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showQr ? "Hide QR code" : "Show QR code"}
      </button>
      {showQr && url && (
        <div className="flex justify-center p-3 bg-white rounded-xl w-fit mx-auto">
          <QRCodeSVG value={url} size={160} />
        </div>
      )}
      <p className="text-xs text-zinc-600 text-center">
        Same table, same room — or scan from the couch.
      </p>
    </div>
  );
}
