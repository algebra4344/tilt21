import type { PokerContext, Position } from "./types";

export type HandAction = "raise" | "call" | "fold";

const toMap = (raise: string[], call: string[]): Record<string, HandAction> => {
  const m: Record<string, HandAction> = {};
  for (const h of raise) m[h] = "raise";
  for (const h of call) m[h] = "call";
  return m;
};

const PREMIUM = ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"];
const PAIRS = ["99", "88", "77", "66", "55", "44", "33", "22"];
const SUITED_ACES = ["A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s"];
const SUITED_BROADWAYS = ["KQs", "KJs", "KTs", "K9s", "QJs", "QTs", "Q9s", "JTs", "J9s", "T9s", "T8s"];
const CONNECTORS = ["98s", "87s", "76s", "65s", "54s"];
const OFFAXES = ["AJo", "ATo", "A9o", "A8o", "KQo", "KJo", "KTo", "QJo", "QTo", "JTo", "T9o"];

export const OPEN_RANGES: Record<Position, Record<string, HandAction>> = {
  UTG: toMap(
    [
      ...PREMIUM,
      "99", "88", "77", "66", "55",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", ...["A5s", "A4s", "A3s", "A2s"],
      "AQo", "AJo", "ATo",
      "KQs", "KJs", "KTs", "K9s",
      "KQo", "KJo",
      "QJs", "QTs", "Q9s",
      "JTs", "J9s",
      "T9s", "T8s",
      "98s", "87s", "76s", "65s",
    ],
    [],
  ),
  "UTG+1": toMap(
    [
      ...PREMIUM,
      "99", "88", "77", "66", "55",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AQo", "AJo", "ATo",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s",
      "JTs", "J9s",
      "T9s", "T8s",
      "98s", "87s", "76s", "65s", "54s",
    ],
    [],
  ),
  "UTG+2": toMap(
    [
      ...PREMIUM, ...PAIRS,
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AQo", "AJo", "ATo", "A9o",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo",
      "JTs", "J9s", "J8s",
      "T9s", "T8s", "T7s",
      "98s", "97s",
      "87s", "86s",
      "76s", "75s",
      "65s", "54s",
    ],
    [],
  ),
  MP: toMap(
    [
      ...PREMIUM, ...PAIRS,
      ...SUITED_ACES,
      "AQo", "AJo", "ATo", "A9o",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo",
      "JTs", "J9s", "J8s",
      "T9s", "T8s", "T7s",
      "98s", "97s",
      "87s", "86s",
      "76s", "75s",
      "65s", "54s",
    ],
    [],
  ),
  HJ: toMap(
    [
      ...PREMIUM, ...PAIRS,
      ...SUITED_ACES,
      "AQo", "AJo", "ATo", "A9o", "A8o",
      "KQs", "KJs", "KTs", "K9s", "K8s", "K7s",
      "KQo", "KJo", "KTo", "K9o",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo",
      "JTs", "J9s", "J8s",
      "JTo",
      "T9s", "T8s", "T7s",
      "T9o",
      "98s", "97s", "96s",
      "87s", "86s", "85s",
      "76s", "75s",
      "65s", "54s",
    ],
    [],
  ),
  CO: toMap(
    [
      ...PREMIUM, ...PAIRS,
      ...SUITED_ACES,
      "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",
      "KQs", "KJs", "KTs", "K9s", "K8s", "K7s",
      "KQo", "KJo", "KTo", "K9o",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo", "Q9o",
      "JTs", "J9s", "J8s",
      "JTo", "J9o",
      "T9s", "T8s", "T7s",
      "T9o",
      "98s", "97s", "96s",
      "87s", "86s", "85s",
      "76s", "75s",
      "65s", "54s",
    ],
    [],
  ),
  BTN: toMap(
    [
      ...PREMIUM, ...PAIRS,
      ...SUITED_ACES,
      "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
      "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
      "KQo", "KJo", "KTo", "K9o", "K8o",
      "QJs", "QTs", "Q9s", "Q8s", "Q7s",
      "QJo", "QTo", "Q9o",
      "JTs", "J9s", "J8s", "J7s",
      "JTo", "J9o",
      "T9s", "T8s", "T7s", "T6s",
      "T9o", "T8o",
      "98s", "97s", "96s", "95s",
      "87s", "86s", "85s",
      "76s", "75s", "74s",
      "65s", "64s",
      "54s", "53s",
    ],
    [],
  ),
  SB: toMap(
    [
      ...PREMIUM, ...PAIRS,
      ...SUITED_ACES,
      "AQo", "AJo", "ATo", "A9o",
      "KQs", "KJs", "KTs", "K9s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s",
      "JTs", "J9s",
      "T9s", "T8s",
      "98s", "87s", "76s", "65s", "54s",
    ],
    [
      "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
      "K8s", "K7s", "K6s", "K5s", "K9o", "K8o",
      "Q8s", "Q7s", "Q9o", "Q8o",
      "J8s", "J7s", "J9o", "J8o",
      "T7s", "T6s", "T9o", "T8o",
      "97s", "96s", "95s", "98o",
      "86s", "85s", "87o",
      "75s", "74s",
      "64s", "53s",
      "43s",
    ],
  ),
  BB: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "AKs", "AKo", "AQs", "AQo", "AJs", "KQs", "KQo"],
    [
      "77", "66", "55", "44", "33", "22",
      "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
      "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
      "KJo", "KTo", "K9o", "K8o",
      "QJs", "QTs", "Q9s", "Q8s", "Q7s",
      "QJo", "QTo", "Q9o", "Q8o",
      "JTs", "J9s", "J8s", "J7s",
      "JTo", "J9o", "J8o",
      "T9s", "T8s", "T7s", "T6s",
      "T9o", "T8o", "T7o",
      "98s", "97s", "96s", "95s",
      "98o", "97o",
      "87s", "86s", "85s",
      "87o", "86o",
      "76s", "75s", "74s",
      "65s", "64s",
      "54s", "53s",
      "43s",
    ],
  ),
};

export const VS_RAISE_RANGES: Record<Position, Record<string, HandAction>> = {
  UTG: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AKo", "AQs", "AQo"],
    [
      "88", "77", "66", "55",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s",
      "AJo", "ATo",
      "KQs", "KJs", "KTs", "K9s",
      "KQo", "KJo",
      "QJs", "QTs", "Q9s",
      "JTs", "J9s",
      "T9s", "T8s",
      "98s", "87s", "76s", "65s",
    ],
  ),
  "UTG+1": toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AKo", "AQs", "AQo"],
    [
      "88", "77", "66", "55",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s",
      "AJo", "ATo",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo",
      "QJs", "QTs", "Q9s",
      "JTs", "J9s",
      "T9s", "T8s",
      "98s", "87s", "76s", "65s",
    ],
  ),
  "UTG+2": toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "AKs", "AKo", "AQs", "AQo"],
    [
      "77", "66", "55", "44", "33",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo",
      "JTs", "J9s", "J8s",
      "T9s", "T8s", "T7s",
      "98s", "97s",
      "87s", "86s",
      "76s", "75s",
      "65s", "54s",
    ],
  ),
  MP: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AKo", "AQs", "AQo"],
    [
      "88", "77", "66", "55", "44", "33",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o",
      "KQs", "KJs", "KTs", "K9s", "K8s",
      "KQo", "KJo", "KTo",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo",
      "JTs", "J9s", "J8s",
      "T9s", "T8s", "T7s",
      "98s", "97s",
      "87s", "86s",
      "76s", "75s",
      "65s", "54s",
    ],
  ),
  HJ: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "AKs", "AKo", "AQs", "AQo", "KQs"],
    [
      "77", "66", "55", "44", "33", "22",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o", "A8o",
      "KJs", "KTs", "K9s", "K8s", "K7s",
      "KQo", "KJo", "KTo", "K9o",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo", "Q9o",
      "JTs", "J9s", "J8s",
      "JTo", "J9o",
      "T9s", "T8s", "T7s",
      "T9o",
      "98s", "97s", "96s",
      "87s", "86s", "85s",
      "76s", "75s",
      "65s", "54s",
    ],
  ),
  CO: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "AKs", "AKo", "AQs", "AQo", "KQs"],
    [
      "77", "66", "55", "44", "33", "22",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o", "A8o",
      "KJs", "KTs", "K9s", "K8s", "K7s",
      "KJo", "KTo", "K9o",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo", "Q9o",
      "JTs", "J9s", "J8s",
      "JTo", "J9o",
      "T9s", "T8s", "T7s",
      "T9o",
      "98s", "97s", "96s",
      "87s", "86s", "85s",
      "76s", "75s",
      "65s", "54s",
    ],
  ),
  BTN: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "AKs", "AKo", "AQs", "AQo", "KQs", "KQo"],
    [
      "66", "55", "44", "33", "22",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",
      "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
      "KJo", "KTo", "K9o", "K8o",
      "QJs", "QTs", "Q9s", "Q8s", "Q7s",
      "QJo", "QTo", "Q9o",
      "JTs", "J9s", "J8s", "J7s",
      "JTo", "J9o",
      "T9s", "T8s", "T7s", "T6s",
      "T9o", "T8o",
      "98s", "97s", "96s", "95s",
      "87s", "86s", "85s",
      "76s", "75s", "74s",
      "65s", "64s",
      "54s", "53s",
    ],
  ),
  SB: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "AKs", "AKo", "AQs", "AQo", "KQs"],
    [
      "88", "77", "66", "55", "44", "33", "22",
      "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "AJo", "ATo", "A9o", "A8o",
      "KJs", "KTs", "K9s", "K8s",
      "KJo", "KTo",
      "QJs", "QTs", "Q9s", "Q8s",
      "QJo", "QTo",
      "JTs", "J9s", "J8s",
      "T9s", "T8s", "T7s",
      "98s", "97s",
      "87s", "86s",
      "76s", "75s",
      "65s", "54s",
    ],
  ),
  BB: toMap(
    ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "AKs", "AKo", "AQs", "AQo", "AJs", "KQs", "KQo"],
    [
      "77", "66", "55", "44", "33", "22",
      "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
      "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
      "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
      "KJo", "KTo", "K9o", "K8o",
      "QJs", "QTs", "Q9s", "Q8s", "Q7s",
      "QJo", "QTo", "Q9o", "Q8o",
      "JTs", "J9s", "J8s", "J7s",
      "JTo", "J9o", "J8o",
      "T9s", "T8s", "T7s", "T6s",
      "T9o", "T8o", "T7o",
      "98s", "97s", "96s", "95s",
      "87s", "86s", "85s",
      "76s", "75s", "74s",
      "65s", "64s",
      "54s", "53s",
    ],
  ),
};

export const VS_3BET_RANGES: Record<string, HandAction> = toMap(
  ["AA", "KK", "QQ", "AKs", "AKo", "JJ", "TT"],
  [
    "99", "88", "77", "66", "55",
    "AQs", "AQo", "AJs", "AJo", "ATs", "ATo",
    "KQs", "KQo", "KJs", "KJo",
    "QJs", "QJo",
    "JTs",
    "T9s",
    "98s",
    "87s",
  ],
);

export function getCorrectAction(
  position: Position,
  hand: string,
  context: PokerContext,
): HandAction {
  if (context === "vs-3bet") return VS_3BET_RANGES[hand] ?? "fold";
  if (context === "vs-raise") return VS_RAISE_RANGES[position][hand] ?? "fold";
  return OPEN_RANGES[position][hand] ?? "fold";
}

export function getExplanation(
  position: Position,
  hand: string,
  action: HandAction,
  context: PokerContext,
): string {
  if (context === "open") {
    if (action === "raise") return `${hand} is strong enough to open-raise from ${position}.`;
    if (action === "call")
      return `${hand} is worth completing from the small blind — limp or raise.`;
    return `${hand} is too weak to open from ${position}.`;
  }
  if (context === "vs-raise") {
    if (action === "raise") return `${hand} is a premium — 3-bet for value against the raise.`;
    if (action === "call") return `${hand} is worth a call but not a 3-bet from ${position}.`;
    return `${hand} doesn't play well against a raise from ${position}.`;
  }
  if (action === "raise") return `${hand} is a premium — 4-bet for value.`;
  if (action === "call") return `${hand} can profitably call the 3-bet.`;
  return `${hand} should fold to a 3-bet.`;
}
