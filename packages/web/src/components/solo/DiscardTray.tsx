"use client";

type DiscardTrayProps = {
  totalCards: number;
  cardsRemaining: number;
  deckCount: number;
  hideDecksText: boolean;
};

export default function DiscardTray({
  totalCards,
  cardsRemaining,
  hideDecksText,
}: DiscardTrayProps) {
  const discarded = totalCards - cardsRemaining;
  const ratio = totalCards > 0 ? discarded / totalCards : 0;

  // Render one card per ~6% of the deck discarded (max ~15 cards).
  const cardCount = Math.max(1, Math.min(15, Math.round(ratio * 16)));
  const decksLeft = cardsRemaining / 52;

  return (
    <div className="flex items-center gap-1.5">
      <div className="discard-tray">
        {Array.from({ length: cardCount }, (_, i) => (
          <div
            key={i}
            className="discard-card"
            style={{
              transform: `translateY(${-i * 1.5}px)`,
              zIndex: i,
            }}
          />
        ))}
      </div>
      {!hideDecksText && (
        <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
          {decksLeft > 0 ? decksLeft.toFixed(1) : "—"}d left
        </span>
      )}
    </div>
  );
}
