<div align="center">

# Tilt21

### Play poker & blackjack online with friends — free, no account needed

Texas Hold'em and blackjack you can actually play with people, not just bots. Open a table, share a link, and you're in. Or run a chipless poker night on real cards with your phones tracking the chips.

</div>

---

## What is Tilt21?

Tilt21 is a card game platform built around one simple idea: **playing cards with friends should be easy.**

No sign-ups, no installs, no setup. You open a table, someone shares the link, and the game runs in your browser in real time. Want practice for yourself? There's a mode for that too.

It all started as a blackjack card counting trainer and grew into a full platform — poker, blackjack, multiplayer, chipless home games, the works. It's still free, still MIT licensed, and you can host your own copy if you want.

**Why the name?** In poker, going *on tilt* is when a bad beat makes you lose your composure and play worse. Tilt21 exists so you can study, practice, and enjoy the game — and keep your cool at the table.

## What can you do with it?

- **Play Texas Hold'em with friends** — real-time multiplayer, invite links and QR codes, and bots fill empty seats so a short-handed table still plays
- **Run a chipless poker night** — bring a real deck, and use your phones to track stacks, bets, and payouts instead of chips. Settlement happens right on screen when the night's over
- **Play poker against bots** — practice heads up or at a full table, and see your equity live
- **Learn blackjack card counting** — a Hi-Lo trainer with visual count hints, true count bet sizing, and instant corrections
- **Play blackjack with friends** — shared tables, private rooms, and in-game chat
- **Practice blackjack solo** — a basic strategy coach that runs entirely in the browser, no backend needed

## Quick start (Docker)

The easiest way to try the whole thing locally:

```bash
docker compose up --build
```

| What | Where |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

## No Docker? Run it manually

```bash
git clone https://github.com/algebra4344/tilt21.git
cd tilt21
npm install
cp .env.example .env
createdb blackjack
npx drizzle-kit push --config packages/server/drizzle.config.ts
npm run dev
```

Then open http://localhost:3000.

## Playing with friends

**Poker (no account):** Pick **Online** or **Chipless** on the home page → enter a name and start a table → tap **Invite** to copy the link or show a QR code. Chipless mode tracks stacks on each player's phone; online poker deals bots into empty seats.

**Blackjack multiplayer (no account):** Open **Multiplayer** → **Quick start** or **New table** → **Invite**. You'll need at least 2 players before the host can deal.

**Blackjack solo:** Open **Solo Practice** — it runs entirely in the browser, no account or backend needed.

## Development

```bash
npm run dev      # server + web, watch mode
npm run build    # build all packages
npm run test     # core (mocha) + server (vitest) tests
npm run lint     # eslint across server + web
```

## Tech stack

| Package | Tech |
| ------- | ---- |
| `core` | TypeScript, zero-dependency game engine (blackjack + poker) |
| `server` | Node.js, Express, Socket.io, Drizzle ORM, PostgreSQL, JWT |
| `web` | Next.js, React, Zustand, Tailwind CSS |

## How the code is organized

The `core` package holds the game engine — rules, deck, hand evaluation, strategy — shared by both the server and the web app. The server is the source of truth for game state and pushes updates over Socket.io; the web app renders the table and sends your actions back over the same connection. That's why everyone at the table sees the same thing in real time.

```
tilt21/
├── packages/
│   ├── core/       # game engine (shared)
│   ├── server/     # Express + Socket.io backend
│   └── web/        # Next.js frontend
├── docker-compose.yml
├── render.yaml     # Render Blueprint (Postgres + API + Web)
└── package.json    # npm workspace root
```

## Deployment

Deploy the full app (Postgres + API + web) in one click using the included [Render Blueprint](render.yaml):

1. Push this repo to GitHub
2. Render dashboard → **New → Blueprint** → connect the repo
3. Wait for `tilt21-web` to go Live — that's your multiplayer URL

Solo practice and poker-vs-bots run entirely client-side, so the web package can also be hosted on its own.

## Testing

- `core`: 119 tests — cards, hands, shoes, strategy, simulator, poker engine
- `server`: 30 tests — limits, blackjack rooms, poker rooms

Run them with `npm run test`.

## License

[MIT](LICENSE)
