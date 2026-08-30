import type { Metadata } from "next";
import ChiplessRoomView from "@/components/chipless/ChiplessRoomView";
import { CHIPLESS_THEME_BOOT } from "@/lib/chiplessTheme";

export const metadata: Metadata = {
  title: "Chipless Poker Night — Real Cards, Digital Chips",
  description:
    "Run your home poker game with a real deck — your phone tracks stacks, bets, and payouts. Create a table, share the link, settle up at the end. Free, no account.",
  keywords: ["home poker game", "chipless poker", "poker chip tracker", "poker night app", "home game ledger"],
};

export default function PokerChiplessPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: CHIPLESS_THEME_BOOT }} />
      <ChiplessRoomView />
    </>
  );
}
