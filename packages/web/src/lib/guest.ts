const GUEST_ID_KEY = "guest-id";
const GUEST_NAME_KEY = "guest-name";
const LEGACY_GUEST_ID_KEY = "poker-guest-id";
const LEGACY_GUEST_NAME_KEY = "poker-guest-name";

const ADJECTIVES = ["Sneaky", "Lucky", "Bluffy", "Tilty", "Steady", "Wild", "Cool", "Rusty"];
const NOUNS = ["Otter", "Hawk", "Shark", "Badger", "Fox", "Moose", "Crab", "Wolf"];

export type GuestIdentity = { guestId: string; guestName: string };

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}

// crypto.randomUUID() is only available in secure contexts (https or
// localhost). Over a LAN IP — exactly how people join a home game from their
// phones — it's undefined, so fall back to a random hex string.
function makeGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Kahoot-style player identity: minted once, lives in localStorage, no server
// account. Clearing browser storage makes you a brand-new person.
export function getGuestIdentity(): GuestIdentity {
  if (typeof window === "undefined") {
    return { guestId: "", guestName: "" };
  }

  let guestId = window.localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = window.localStorage.getItem(LEGACY_GUEST_ID_KEY);
    if (guestId) window.localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  if (!guestId || guestId.length < 8) {
    guestId = makeGuestId();
    window.localStorage.setItem(GUEST_ID_KEY, guestId);
  }

  let guestName = window.localStorage.getItem(GUEST_NAME_KEY);
  if (!guestName) {
    guestName = window.localStorage.getItem(LEGACY_GUEST_NAME_KEY);
    if (guestName) window.localStorage.setItem(GUEST_NAME_KEY, guestName);
  }
  if (!guestName) {
    guestName = randomName();
    window.localStorage.setItem(GUEST_NAME_KEY, guestName);
  }

  return { guestId, guestName };
}

export function setGuestName(name: string): void {
  if (typeof window === "undefined") return;
  const cleaned = name.trim().slice(0, 20);
  if (cleaned) {
    window.localStorage.setItem(GUEST_NAME_KEY, cleaned);
    window.localStorage.setItem(LEGACY_GUEST_NAME_KEY, cleaned);
  }
}

/** Local player id for multiplayer — registered user id or stable guest id. */
export function getLocalPlayerId(registeredUserId?: string | null): string {
  if (registeredUserId) return registeredUserId;
  return getGuestIdentity().guestId;
}

// Stable per-identity avatar color: derived from the guest/user id so your
// color follows you across tables, sessions and seat changes — and two people
// with the same display name are visually distinguishable.
const IDENTITY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#a855f7", // purple
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#8b5cf6", // violet
];

const FALLBACK_COLOR = "#52525b"; // zinc-600

export function identityColor(id: string | null | undefined): string {
  if (!id) return FALLBACK_COLOR;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return IDENTITY_COLORS[hash % IDENTITY_COLORS.length];
}
