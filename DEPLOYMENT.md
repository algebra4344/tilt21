# Deployment checklist — Neon + Render (API) + Vercel (web)

For `tilt21-web`/`tilt21-api` on Render's free tier: 750 instance-hours per
workspace per month, shared across **all** free services. One always-on service
fits (~730-744 h); two do not — that is why the web frontend lives on Vercel.

Fill in the placeholders as you go:

```
NEON_URL      = postgresql://...?sslmode=require   (pooled, from Neon dashboard)
VERCEL_URL    = https://<project>.vercel.app       (production domain)
RENDER_API    = https://tilt21-api.onrender.com
OLD_RENDER_DB = <External Connection String of tilt21-db, if it still exists>
```

## 1. Neon (database)

- [ ] Create a project + database at https://neon.tech
- [ ] Copy the **pooled** connection string; append `?sslmode=require` if missing
- [ ] Save it as `NEON_URL`

The schema is applied automatically by the API's `preDeployCommand` and on boot,
so no manual migration is needed for a fresh database.

## 2. Optional: retain data from the old Render Postgres

Render free Postgres expires 30 days after creation. Check the dashboard first —
if `tilt21-db` is already gone or expired, skip this step.

- [ ] Render dashboard → `tilt21-db` → Info → **External Connection String**
- [ ] Dump the data (requires `pg_dump` locally):

```bash
pg_dump "OLD_RENDER_DB" --data-only --no-owner -f tilt21-data.sql
```

- [ ] Keep `tilt21-data.sql` until step 5 completes

## 3. Vercel (web frontend)

- [ ] Vercel → **Add New → Project** → import `algebra4344/tilt21`
- [ ] Set **Root Directory** to `packages/web`
      (the checked-in `vercel.json` handles the workspace install/build)
- [ ] Add environment variables (read at build time):

```
NEXT_PUBLIC_API_URL = https://tilt21-api.onrender.com
NEXT_PUBLIC_WS_URL  = https://tilt21-api.onrender.com
```

- [ ] Deploy and copy the production URL into `VERCEL_URL`
- [ ] Note: Hobby plan is for non-commercial use only; `NEXT_PUBLIC_*` values are
      baked in at build time, so changing the API URL requires a redeploy

## 4. Render (API only)

- [ ] Render dashboard → Blueprint sync for this repo
- [ ] When prompted, fill the `sync: false` env vars:
  - `DATABASE_URL` = `NEON_URL`
  - `CORS_ORIGIN` = `VERCEL_URL` (exact browser origin, no trailing slash)
- [ ] Confirm deletion of `tilt21-web` and `tilt21-db` from the blueprint
      (only after step 2's dump)
- [ ] Deploy `tilt21-api`; watch logs for `Database schema applied.`
- [ ] If a dashboard-managed setup was used instead of Blueprint, delete the
      `tilt21-web` service manually and edit the API env vars by hand

The api service should be the only free web service left in the workspace.

## 5. Restore data (only if step 2 was done)

- [ ] After the first successful API deploy against Neon:

```bash
psql "NEON_URL" -f tilt21-data.sql
```

## 6. Keep-alive and verification

- [ ] Point the keep-alive pinger at `https://tilt21-api.onrender.com/health`
      only (5-10 min interval); delete any ping to the web service. Never ping
      a second free service — it would consume the shared 750 h quota
- [ ] `curl https://tilt21-api.onrender.com/health` returns `{"status":"ok",...}`
- [ ] Load `VERCEL_URL`, start a poker table, join from a second device
      (verifies WebSocket + CORS)
- [ ] Register/login and open the leaderboard (verifies the Neon path)
- [ ] Render dashboard → usage stays under 750 instance-hours for the month
- [ ] Update the `Play it now:` link in README.md to `VERCEL_URL`

## Caveats

- The current month's suspension lifts at the start of the next month. Removing
  the second service does **not** restore it early; adding a payment method to
  Render is the only immediate option (overage becomes billable).
- Spun-down services (15 min without traffic) consume no instance-hours, but
  take 30-60 s to wake up.
- A 31-day month is 744 hours; one always-on service leaves only ~6 hours of
  headroom. Do not add a second always-on free service to this workspace.
- Render's free Postgres expiry is why `tilt21-db` was removed from
  `render.yaml`; do not re-add a `databases:` block.
