import type { Metadata } from "next";
import PokerOnlineBoard from "@/components/poker/online/PokerOnlineBoard";

export const metadata: Metadata = {
  title: "Play Poker Online with Friends — Free",
  description:
    "Create a Texas Hold'em table, share the link, and play together — bots fill empty seats so you can start instantly. Free, no account needed.",
  keywords: ["online poker with friends", "free multiplayer poker", "holdem online", "private poker table"],
};

export default function PokerOnlinePage() {
  return <PokerOnlineBoard />;
}
