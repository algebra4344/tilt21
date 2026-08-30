<div align="center">

# Tilt21

### Free, open-source multiplayer poker & blackjack platform

Play **Texas Hold'em** and **blackjack** online with friends, train against bots, or run a **chipless poker night** with real cards and digital chips. Real-time, no account required, MIT licensed.

</div>

---

## What is Tilt21?

Tilt21 is a real-time multiplayer card game platform built for playing poker and blackjack with friends. It started as a blackjack card counting trainer and grew into a full platform — but it's still free, still no sign-up required to play, and designed to be self-hostable.

**Why "tilt"?** In poker, *going on tilt* means losing your composure after a bad beat. Tilt21 exists to help you study, practice, and play — so the tilt never happens in the first place.

## Features

### Texas Hold'em Poker

- **Play poker online with friends** — real-time multiplayer via WebSocket, bots fill empty seats, invite links + QR codes
- **Chipless poker night** — the home game killer app: use a real physical deck, phones track stacks, bets, and payouts, with a settlement modal at the end. No chips required, no hardware to buy
- **Play vs bots** — solo Texas Hold'em trainer with live equity, hand history, and session stats
- **Full hand evaluation** — royal flush through high card, preflop ranges (open / vs 3-bet / vs raise), 6 and 9 player tables

### Blackjack

- **Card counting trainer** — Hi-Lo count with visual card pops, true count bet sizing, active count verification with tolerance grading
- **Basic strategy coach** — plain-English corrections, hand history with per-hand tips, game modes (default, pairs, uncommon, deviations), Illustrious 18 deviations
- **Multiplayer blackjack** — share a link, play in real time with friends, private rooms with join tokens, in-game chat
- **EV simulator** — multi-core simulation engine computes EV for any table conditions (deck count, rules, penetration, bet spread)

### Platform

- **No account required to play** — guest mode for multiplayer and practice
- Optional accounts: JWT auth, persistent stats, leaderboards
- In-memory rooms with idle sweep, per-IP and global table caps
- Responsive dark-mode UI, landscape mode for table games
- Docker Compose for one-command local setup, Render Blueprint for one-click deploy

## Tech Stack

| Package | Tech |
| ------- | ---- |
| `core` | TypeScript, zero-dependency game engine (blackjack + poker), Webpack |
| `server` | Node.js, Express, Socket.io, Drizzle ORM, PostgreSQL, JWT, Zod |
| `web` | Next.js 16, React 19, Zustand, Tailwind CSS 4, Socket.io client |

## Quick Start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- PostgreSQL: localhost:5432

## Manual Setup

```bash
git clone https://github.com/algebra4344/tilt21.git
cd tilt21
npm install
cp .env.example .env
createdb blackjack
npx drizzle-kit push --config packages/server/drizzle.config.ts
npm run dev
```

## How to Play

### Poker (no account)

1. Pick **Online** or **Chipless** from the home page
2. Enter a name and start a table — or open a shared link
3. Tap **Invite** to copy the link, share it, or show the QR code
4. Chipless mode tracks stacks on each player's phone; online poker deals bots into empty seats

### Blackjack multiplayer (no account)

1. Open **Multiplayer** from the home page (or `/lobby`)
2. Tap **Quick start** or **New table**, then **Invite**
3. Need at least 2 players before the host can start a hand

### Blackjack practice (solo)

Open **Solo Practice** — runs entirely in the browser, no backend needed.

## Development Commands

```bash
npm run dev      # server + web in watch mode
npm run build    # build all packages
npm run test     # core (mocha) + server (vitest) tests
npm run lint     # eslint across server + web
```

## Deployment

### Render (recommended, full app)

The repo includes a [Render Blueprint](render.yaml) that provisions PostgreSQL, the API, and the web frontend in one click:

1. Push this repo to GitHub
2. Render dashboard → **New → Blueprint** → connect the repo
3. Wait for `tilt21-web` to go Live — that's your multiplayer URL

Solo practice (`/practice`) and the poker-vs-bots trainer run entirely client-side, so the web package can also be deployed standalone.

## Architecture

```
tilt21/
├── packages/
│   ├── core/       # Game engine — rules, deck, hand evaluation, strategy (shared)
│   ├── server/     # Express + Socket.io backend — API, auth, lobby, rooms
│   └── web/        # Next.js frontend — pages, components, state
├── docker-compose.yml
├── render.yaml     # Render Blueprint (Postgres + API + Web)
└── package.json    # npm workspace root
```

The `core` package is the shared game engine consumed by both `server` and `web`. The server is authoritative over game state and broadcasts updates via Socket.io; the web client renders the UI and sends actions over WebSocket.

## Testing

- `core`: 119 tests (mocha + chai) — cards, hands, shoes, strategy, simulator, poker engine
- `server`: 30 tests (vitest) — limits, blackjack rooms, poker rooms

## License

[MIT](LICENSE)