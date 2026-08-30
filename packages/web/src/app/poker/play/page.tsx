import type { Metadata } from "next";
import PokerTrainerBoard from "@/components/poker/PokerTrainerBoard";

export const metadata: Metadata = {
  title: "Free Texas Hold'em Trainer — Play vs Bots",
  description:
    "Practice poker decisions in six-handed no-limit hold'em. Play full hands against bots with live equity percentages, hand history, and session stats. Free.",
  keywords: ["poker trainer", "texas holdem practice", "poker equity", "holdem trainer", "poker practice"],
};

export default function PokerPlayPage() {
  return <PokerTrainerBoard />;
}
