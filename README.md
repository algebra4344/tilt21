<div align="center">

# Tilt21

### Play poker & blackjack online with friends — free, no account needed

Texas Hold'em and blackjack you can actually play with people, not just bots. Open a table, share a link, and you're in. Or run a chipless poker night on real cards with your phones tracking the chips.

**Play it now:** [tilt21-web.onrender.com](https://tilt21-web.onrender.com)

</div>

---

## Features

- **Texas Hold'em with friends** — start a table, share the link, everyone's in. Bots fill empty seats when your group is short a player or two.
- **Chipless poker night** — you've got a real deck but no chips. Phones track everyone's stacks, and it settles up when the night's over.
- **Poker against bots** — play heads up or full table, with your live win chances on screen.
- **Blackjack card counting trainer** — Hi-Lo counting with hints when you lose track, and it tells you when your bet should go up.
- **Blackjack with friends** — shared tables, private rooms, and a chat to talk trash.
- **Blackjack solo** — a basic strategy coach that runs right in your browser.

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
