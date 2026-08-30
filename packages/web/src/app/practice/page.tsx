import type { Metadata } from "next";
import PracticeBoard from "@/components/solo/PracticeBoard";

export const metadata: Metadata = {
  title: "Free Blackjack Basic Strategy Trainer",
  description:
    "Practice blackjack basic strategy with instant feedback. Hit, stand, double, split — with card counting, deviations, and accuracy tracking. Free, no account needed.",
  keywords: ["blackjack trainer", "basic strategy", "blackjack practice", "card counting", "hi-lo"],
};

export default function PracticePage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <PracticeBoard />
    </div>
  );
}
