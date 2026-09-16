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
├── render.yaml     # Render Blueprint (API only; web runs on Vercel)
└── package.json    # npm workspace root
```

## Deployment

The app deploys as three free services: **Vercel** hosts the Next.js frontend, **Render** runs the API, and **Neon** provides PostgreSQL (Render's free Postgres expires 30 days after creation).

### 1. Database — Neon

1. Create a project and database at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string and append `?sslmode=require` if it isn't already there

### 2. API — Render

1. Render dashboard → **New → Blueprint** → connect this repo
2. When prompted, fill in the `sync: false` env vars:
   - `DATABASE_URL` — the Neon pooled connection string
   - `CORS_ORIGIN` — the Vercel production URL from step 3
3. `tilt21-api` applies the database schema automatically on deploy (`preDeployCommand` and on boot)

### 3. Web — Vercel

1. Vercel → **Add New → Project** → import this repo
2. Set **Root Directory** to `packages/web` (the included `vercel.json` handles the workspace build)
3. Add environment variables (read at build time):
   - `NEXT_PUBLIC_API_URL` = `https://tilt21-api.onrender.com`
   - `NEXT_PUBLIC_WS_URL` = `https://tilt21-api.onrender.com`
4. Deploy, then set the API's `CORS_ORIGIN` to the resulting production URL and redeploy the API

### Free tier notes

- Render's free tier includes 750 instance-hours per month **shared across every free service in the workspace**. One always-on service fits (~730-744 h); two do not. Keep-alive pings should hit only the API (`/health`), never a second service.
- Spun-down services (15 minutes without incoming traffic) consume no instance-hours.
- `NEXT_PUBLIC_*` values are baked in at build time — if the API URL changes, redeploy the frontend.
- Vercel's Hobby plan is for non-commercial use only.
- Solo practice and poker-vs-bots run entirely client-side, so the web package can also be hosted on its own.

## Testing

- `core`: 119 tests — cards, hands, shoes, strategy, simulator, poker engine
- `server`: 30 tests — limits, blackjack rooms, poker rooms

Run them with `npm run test`.

## License

[MIT](LICENSE)
