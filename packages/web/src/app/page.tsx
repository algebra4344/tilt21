"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100">Cards</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Play solo to improve, or grab your friends.
          </p>
        </div>

        {/* Hold'em */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div>
              <h2 className="text-xl font-bold text-zinc-100">Texas Hold&apos;em</h2>
              <p className="text-xs text-zinc-500">
                Learn, play remote, or run a real-card game night
              </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Solo", sub: "vs bots", path: "/poker/play", cls: "amber" },
              { label: "Online", sub: "remote · bots fill seats", path: "/poker/online", cls: "emerald" },
              { label: "Chipless", sub: "real cards", path: "/poker/chipless", cls: "sky" },
            ].map((c) => (
              <button
                key={c.path}
                onClick={() => router.push(c.path)}
                className={`py-5 rounded-2xl border active:scale-95 transition-all text-center ${
                  c.cls === "amber"
                    ? "bg-amber-600/15 border-amber-500/30 hover:bg-amber-600/25"
                    : c.cls === "emerald"
                      ? "bg-emerald-600/15 border-emerald-500/30 hover:bg-emerald-600/25"
                      : "bg-sky-600/15 border-sky-500/30 hover:bg-sky-600/25"
                }`}
              >
                <span className={`block font-bold text-base ${
                  c.cls === "amber" ? "text-amber-300" : c.cls === "emerald" ? "text-emerald-300" : "text-sky-300"
                }`}>{c.label}</span>
                <span className="block text-zinc-500 text-[11px] mt-0.5">{c.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Blackjack */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div>
              <h2 className="text-xl font-bold text-zinc-100">Blackjack</h2>
              <p className="text-xs text-zinc-500">
                Card counting, basic strategy & deviations
              </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/practice")}
              className="py-5 rounded-2xl bg-green-600/15 border border-green-500/30 hover:bg-green-600/25 hover:border-green-500/50 active:scale-95 transition-all text-center"
            >
              <span className="block text-green-300 font-bold text-base">Solo Practice</span>
              <span className="block text-zinc-500 text-[11px] mt-0.5">train vs dealer</span>
            </button>
            <button
              onClick={() => router.push("/lobby")}
              className="py-5 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/25 hover:border-emerald-500/50 active:scale-95 transition-all text-center"
            >
              <span className="block text-emerald-300 font-bold text-base">Multiplayer</span>
              <span className="block text-zinc-500 text-[11px] mt-0.5">
                share a link & play
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Poker and blackjack multiplayer are free — no account needed.
        </p>
      </div>
    </div>
  );
}
