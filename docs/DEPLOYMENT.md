# Deployment guide

How to deploy the PH Badminton Club monorepo to production on **free tiers**. The stack is fixed: **Supabase** (backend) + **two SvelteKit frontends** (player + admin).

> **Living plan:** [PROJECT_PLAN.md](./PROJECT_PLAN.md) — features and phases.  
> **Agent conventions:** [../AGENTS.md](../AGENTS.md) — env vars, migrations, verify commands.

## Architecture

```
                    ┌─────────────────────────────────┐
                    │  Supabase (1 prod project)      │
                    │  Postgres · Auth · Storage      │
                    │  pg_cron · Realtime · Functions │
                    └───────────────┬─────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
    ┌─────────▼─────────┐                     ┌───────────▼──────────┐
    │  player-app       │                     │  admin-app           │
    │  (public PWA)     │                     │  (staff / super)     │
    │  app.example.com  │                     │  admin.example.com   │
    └───────────────────┘                     └──────────────────────┘
         Vercel / Cloudflare Pages                 Vercel / Cloudflare Pages
```

Both apps share the **same Supabase project** (same `PUBLIC_SUPABASE_URL` and keys). They are separate origins with separate OAuth redirect URLs and cookies.

## Recommended URLs

| App | Example domain | Dev port |
| --- | -------------- | -------- |
| Player | `https://app.example.com` | `5173` |
| Admin | `https://admin.example.com` | `5174` |

Use HTTPS everywhere (required for PWA install and OAuth).

---

## 1. Supabase (production)

### Create project

1. [supabase.com](https://supabase.com) → New project (free tier).
2. Note **Project URL**, **publishable key**, and **secret key** (Settings → API).

### Link repo and push migrations

From repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) installed):

```bash
yarn supabase link --project-ref <your-project-ref>
yarn db:push
```

This applies all files in `supabase/migrations/`. Re-run after pulling new migrations.

Local-only reset (destroys data): `yarn db:reset` — **never** on production.

### Auth settings

**Authentication → URL configuration**

| Setting | Value |
| ------- | ----- |
| Site URL | `https://app.example.com` (player is primary) |
| Redirect URLs | `https://app.example.com/auth/callback` |
| | `https://admin.example.com/auth/callback` |
| | Preview URLs if using Vercel previews, e.g. `https://*.vercel.app/auth/callback` |

**Authentication → Providers**

- Enable **Email** (and Google / Facebook if used).
- Add each provider’s OAuth redirect to match Supabase’s callback URL for your project.

**Authentication → Sessions**

- Set **time-box** to at least **720 hours (30 days)** so admin refresh tokens outlive the 30-day admin cookie. Player app uses a 7-day cookie; the longer project setting covers both.

### Storage

Migrations create the public `avatars` bucket and RLS. No extra dashboard step unless you add buckets later.

### pg_cron (session + match lifecycle)

Migrations `0021` / `0022` / `0028` schedule `start_due_sessions()` every minute when `pg_cron` is available on hosted Supabase. Migration `0032` schedules `expire_pending_matches()` every minute (match invite expiry). Migrations `0029`–`0031` add cancel-lock, live player activity, and end-session-early RPCs (no extra cron). If cron is unavailable, status updates still run via **lazy sweep** when someone loads admin or player pages (`sweepStartedSessions()`, `expire_pending_matches()` on match pages).

### Realtime (live session + matches)

Migrations `0023` / `0024` add `sessions`, `session_players`, `payments`, and `session_leave_requests` to the `supabase_realtime` publication. Migration `0030` adds `activity` / `idle_since` columns (same channel). Migration `0032` adds `matches`, `match_players`, and `match_games` for live match invites and score updates. Realtime is enabled by default on hosted Supabase — no dashboard step. If a live page never refreshes, confirm **Database → Replication** has these tables published.

---

## 2. Front-end hosting

Both apps use `@sveltejs/adapter-auto` (works on Vercel out of the box). Pick **one** provider and deploy **two** sites.

### Option A — Vercel (recommended)

Create **two** Vercel projects from the same Git repo.

#### Player project

| Setting | Value |
| ------- | ----- |
| Root Directory | `player-app` |
| Framework Preset | SvelteKit |
| Install Command | `yarn install` (run from repo root; enable monorepo / include parent if prompted) |
| Build Command | `yarn build` |
| Output | Auto (SvelteKit) |

#### Admin project

Same as player, but **Root Directory** = `admin-app`.

#### Environment variables

Set in each Vercel project → Settings → Environment Variables.

**Player app**

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Secret key — server only |
| `PUBLIC_APP_NAME` | Optional | Default in `.env.example` |
| `PUBLIC_APP_SHORT_NAME` | Optional | PWA short name |
| `PUBLIC_APP_VERSION` | Optional | Display version |

**Admin app** (all player vars plus)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `MASTER_KEY_SHA256` | Yes (bootstrap) | SHA-256 hex of bootstrap secret — see below |
| `CLUB_MAX_ACTIVE_SESSIONS_LIMIT` | Optional | Default `50` |
| `CLUB_MAX_ADMINS_LIMIT` | Optional | Default `20` |

Generate `MASTER_KEY_SHA256`:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your-strong-secret').digest('hex'))"
```

Store only the **hash** in Vercel. Keep the raw secret offline for the one-time promote call.

#### Custom domains

- Player project → `app.example.com`
- Admin project → `admin.example.com`

Then update Supabase Auth redirect URLs to match.

---

### Option B — Cloudflare Pages

Works, but you may want to switch to `@sveltejs/adapter-cloudflare` explicitly for predictable Workers/Pages behavior instead of `adapter-auto`.

Per project:

- Build command: `cd ../.. && yarn install && yarn workspace player-app build` (adjust path for monorepo checkout layout)
- Output directory: `player-app/.svelte-kit/cloudflare` or per adapter docs after switching adapter

Use the same env vars as Vercel. Bind secrets in Cloudflare dashboard (not committed).

---

## 3. Bootstrap first super admin

1. Register a normal account on the **player app** (production URL).
2. Copy the user’s UUID from Supabase **Authentication → Users**.
3. One-time POST to admin app (replace URL, secret, and UUID):

```bash
curl -X POST https://admin.example.com/api/internal/promote-superadmin \
  -H "Content-Type: application/json" \
  -H "x-master-key: YOUR_RAW_SECRET" \
  -d '{"userId":"USER_UUID_HERE"}'
```

4. Sign in at `https://admin.example.com`.

**Security:** This endpoint is not linked from the UI. After bootstrap, consider removing `MASTER_KEY_SHA256` from production or rotating the secret so the endpoint cannot be abused. Rate limiting is not implemented yet (see Phase 2a notes in PROJECT_PLAN).

---

## 4. Staging (optional)

| Layer | Suggestion |
| ----- | ---------- |
| Supabase | Second free project for staging |
| Frontends | Vercel **Preview** deployments per PR |
| Migrations | `yarn supabase link` to staging ref → `yarn db:push` before merging |

Add staging callback URLs to Supabase Auth allowlist.

---

## 5. Post-deploy checklist

- [ ] `yarn db:push` applied on production Supabase
- [ ] Both apps build and load over HTTPS
- [ ] Player: register, login, OAuth, profile avatar upload
- [ ] Admin: login, super-admin home, create club, sessions list
- [ ] OAuth redirects work on both domains (no “redirect URL mismatch”)
- [ ] PWA: manifest and install prompt on player app (mobile)
- [ ] Session lifecycle: open session transitions at `start_at` (cron or page-load sweep)
- [ ] Live session: player `/sessions/[id]/live` and admin `/sessions/[id]/control` update in realtime (activity badges, break toggle, idle timer, court grid)
- [ ] Matches: admin creates manual match → players receive invite → all accept → match active; player submits score → peers confirm → completed (or dispute → admin resolve on `/control/match/[matchId]`)
- [ ] Payments: settlement → PromptPay QR renders → submit → admin approve → close session (or end early → approve → close before `end_at`); bill includes shuttle share when shuttles were added during matches
- [ ] Cancellation fee: late cancel shows QR; admin confirm/waive works
- [ ] Match history: `/matches/history` (player) and session history pages load
- [ ] Super admin promoted; backdoor key handled safely

### Verify locally before deploy

```bash
yarn check:player && yarn check:admin
yarn test:player && yarn test:admin
yarn build:player && yarn build:admin
```

---

## 6. What runs where

| Concern | Where |
| ------- | ----- |
| Postgres, RLS, RPCs | Supabase |
| Auth (email, OAuth, cookies) | Supabase Auth + SvelteKit `@supabase/ssr` in each app |
| Avatar files | Supabase Storage |
| `start_due_sessions` cron | Supabase `pg_cron` (hosted) |
| Lazy session sweep | Server load handlers in both apps |
| Live session + match updates | Supabase Realtime (`sessions`, `session_players`, `payments`, `session_leave_requests`, `matches`, `match_players`, `match_games`) |
| Payment settlement / close | Supabase RPCs (`begin_session_settlement`, `end_session_early`, `approve_payment`, `close_session`); court + shuttle share via `compute_session_court_share` / `compute_session_player_shuttle_share` |
| PromptPay QR | Client-side in player-app (`promptpay-qr` + `qrcode`) — no extra host |
| Edge Functions (future) | Auto ELO matchmaking + ELO calc — not deployed yet (no `supabase/functions/` directory) |

---

## 7. Troubleshooting

| Symptom | Likely fix |
| ------- | ---------- |
| OAuth redirect error | Add exact production callback URLs in Supabase Auth |
| Admin session dies early | Supabase session time-box &lt; 720 h — increase to 30 days |
| Sessions never go `in_progress` | Run `yarn db:push`; load admin/player page to trigger sweep; check Supabase logs for `pg_cron` |
| RLS errors on player refresh | Ensure `SUPABASE_SECRET_KEY` set on player deploy; auth cookies present |
| Build fails on Vercel | Set Root Directory to `player-app` or `admin-app`; install from monorepo root |
| `shared/ui` not found | Build must run with workspace root available (Yarn workspaces) |

---

## 8. Out of scope for this doc

- Custom VPS / Docker (not required for current architecture)
- Payment gateway hosting (PromptPay is client-generated QR)
- CI/CD pipeline files (add GitHub Actions + Vercel Git integration when ready)

When adding deployment automation, keep **two deploy targets** and **one Supabase project** (per environment) as the invariant.
