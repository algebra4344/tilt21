# Deploy to a live site (phone testing)

Fastest path: **[Render](https://render.com)** (free tier, HTTPS, WebSockets). Takes ~15 minutes once the code is on GitHub.

## 1. Put `cards` on GitHub

The deploy config lives in this folder. Use a **dedicated repo** for `cards` (simplest), or a monorepo with Root Directory = `cards`.

```bash
cd /path/to/cards
git init -b main
git add .
git commit -m "Initial commit"
# Create an empty repo on GitHub, then:
git remote add origin git@github.com:YOUR_USER/cards.git
git push -u origin main
```

Do not commit `.env` — only `.env.example`.

## 2. Deploy on Render

1. Sign in at [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint**
3. Connect the GitHub repo
4. If the repo is the parent monorepo, set **Root Directory** to `cards`
5. Render reads `render.yaml` and creates:
   - `cards-db` (Postgres)
   - `cards-api` (Socket.io + API, port 3001)
   - `cards-web` (Next.js, port 3000)
6. Wait for both web services to go **Live** (first build ~5–10 min)

## 3. Test on your phone

Open the **`cards-web`** URL Render shows (e.g. `https://cards-web-xxxx.onrender.com`):

- Home → **Chipless** or **Online** → start table → **Invite** → share link to another phone
- Home → **Multiplayer** (blackjack) → **Quick start** → **Invite**

Render free tier: services sleep after ~15 min idle; first load after sleep takes ~30s.

## 4. Custom domain (optional)

In Render → `cards-web` → **Settings** → **Custom Domain**, add your domain. Update `CORS_ORIGIN` on `cards-api` if you use a custom front-end URL (Blueprint wiring usually handles `*.onrender.com` automatically).

## Environment variables (reference)

| Service | Variable | Set by |
|---------|----------|--------|
| cards-api | `DATABASE_URL` | Render Postgres |
| cards-api | `JWT_SECRET` | Auto-generated |
| cards-api | `CORS_ORIGIN` | Linked from cards-web URL |
| cards-web | `NEXT_PUBLIC_API_URL` | Linked from cards-api URL |
| cards-web | `NEXT_PUBLIC_WS_URL` | Same as API URL |

`NEXT_PUBLIC_*` are baked in at **build** time. If you change API URL, redeploy `cards-web`.

## Local production smoke test

```bash
docker compose up --build
```

Set in `.env`:

```
JWT_SECRET=local-dev-secret-at-least-32-characters-long
CORS_ORIGIN=http://localhost:3000
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Socket won’t connect | Confirm `NEXT_PUBLIC_WS_URL` matches the API’s `https://` URL |
| CORS errors | `CORS_ORIGIN` on API must exactly match the web origin (no trailing slash) |
| Share/clipboard fails on phone | Must use `https://` (Render provides this) |
| Tables disappear | Expected — rooms are in-memory; redeploy/restart ends games |
