# PH Badminton Club

A mobile-first monorepo for organizing 2v2 badminton club sessions: player auth and profiles, ELO ranking, geo-discovered sessions, matchmaking, peer-confirmed scoring, and free PromptPay split-cost payments. The goal is a full club workflow on **free tiers** (Supabase, Vercel/Cloudflare Pages, client-side PromptPay QR).

> **Living plan:** [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) — architecture, data model, flows, and phased roadmap.

## Current status

| Phase | Scope                                   | Status        |
| ----- | --------------------------------------- | ------------- |
| 1     | Player auth & profile                   | **Completed** |
| 2     | DB schema, RLS, clubs & admin hierarchy | **Completed** |
| 3     | Sessions (geo discovery, join/approve, lifecycle, live + control) | **Completed** |
| 4     | Matchmaking + realtime offers           | **Completed (manual)**; auto ELO not started |
| 5     | Scoring, disputes, admin resolve        | **Completed** |
| 6     | ELO engine + leaderboard                | Not started   |
| 7     | Payment summary + PromptPay QR          | **Completed** (court + shuttle share settlement, early leave, cancellation fees) |
| 8     | Push notifications + offline polish     | Not started   |

**Shipped (`player-app`):**

- Register / login with **email or Thai phone** + password; **Google & Facebook** OAuth; 7-day cookies
- Profile: edit display name, avatar, **email / phone / password**; **outstanding fees + transaction history**
- **Session discovery** (distance-sorted), join / waitlist / queue, **my sessions** on home; **session history**
- **Live session** (Realtime): court grid, **match invites**, uptime, cost estimate (court + shuttle), roster, break toggle, **early-leave request**, **PromptPay payment QR**
- **In-match scoring**: submit scores, peer confirm/reject; **match history** (`/matches/history`)
- Installable **PWA** (manifest, service worker, app icons); mobile-oriented UI

**Shipped (`admin-app`):**

- Super-admin: club CRUD, assign club admins, user management; club-admin: dashboard + club settings (shuttles, PromptPay, location)
- Sessions: create / edit / list / detail / history, confirm/reject players, draft & min-player **lifecycle**
- **Live session control** (Realtime): **manual matchmaking**, court grid, per-match control (shuttles, score resolve), settlement, payment approval, early-leave approval, **close session**, cancellation-fee confirm/waive
- Cross-session **transactions** view (`/transactions`)

**Not yet built:** auto ELO matchmaking, ELO/leaderboard (Phase 6), push notifications (Phase 8).

## Monorepo layout

```
ph-badminton-club-project/
├── docs/PROJECT_PLAN.md    # Big-picture plan & phase specs
├── docs/DEPLOYMENT.md      # Production deploy guide (Supabase + 2 frontends)
├── shared/ui/                # Shared UI imported by both apps via @repo/ui
├── supabase/                 # Shared DB schema & migrations (both apps)
├── player-app/               # Player PWA (SvelteKit) — active
├── admin-app/                # Admin PWA (SvelteKit) — active
├── package.json              # Yarn workspaces root
└── README.md
```

See [AGENTS.md](AGENTS.md) for the shared-UI rules, cross-cutting conventions, and per-app structure.

Supabase migrations live in `supabase/` at the repo root. Both `player-app` and `admin-app` connect to the same Supabase project via their own `.env` files (same URL and keys).

## Tech stack

| Layer           | Choices                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| Frontend        | SvelteKit 5, Svelte runes, Tailwind CSS 4, `@vite-pwa/sveltekit`            |
| Backend         | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions — later phases) |
| Validation      | Zod                                                                         |
| Tests           | Vitest                                                                      |
| Package manager | Yarn 4 (Berry)                                                              |

**In use now:** Supabase Realtime (live session + matches), PromptPay QR (`promptpay-qr` + `qrcode`, client-side in player-app), manual matchmaking + peer scoring.
**Planned (later phases):** PostGIS, Web Push, Edge Functions for auto ELO matchmaking / ELO calc.

## Prerequisites

- **Node.js** 20+
- **Yarn** 4 (`corepack enable && corepack prepare yarn@4.17.0 --activate`)
- **Python 3** + Pillow (optional — `yarn icons:player` for PWA icons)
- A **Supabase** project (free tier)

## Getting started

### 1. Install dependencies

From the repo root:

```bash
yarn install
```

### 2. Configure environment

Copy the example env files and fill in your Supabase keys (both apps share the **same** Supabase project):

```bash
cp player-app/.env.example player-app/.env
cp admin-app/.env.example admin-app/.env
```

The admin app needs a few extra vars (`MASTER_KEY_SHA256` for super-admin bootstrap, optional limits) — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) (Phase 2a).

| Variable                    | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `PUBLIC_APP_NAME`           | Full app name (PWA manifest, header)                       |
| `PUBLIC_APP_SHORT_NAME`     | Short name (home screen)                                   |
| `PUBLIC_APP_VERSION`        | Display / cache version                                    |
| `PORT`                      | Dev server port (default `5173`)                           |
| `PUBLIC_SUPABASE_URL`              | Supabase project URL                                          |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | Supabase publishable key (`sb_publishable_...`)              |
| `SUPABASE_SECRET_KEY`              | Secret key `sb_secret_...` (**server only**, never expose)   |

### 3. Supabase setup

The Supabase CLI is a root dev dependency — use `yarn db:*` / `yarn supabase:*` from the repo root (no global install needed).

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations (pick one):
   - **CLI:** link once, then push:
     ```bash
     yarn supabase link --project-ref <your-project-ref>
     # or: yarn supabase:link --project-ref <your-project-ref>
     yarn db:push
     ```
   - **Dashboard:** paste `supabase/migrations/0001_init.sql` into the SQL editor.
3. **Auth → Providers:** enable Google and Facebook; set redirect URL to `http://localhost:{PORT}/auth/callback` (and your production URL later).
4. **Auth → Sessions:** set time-box to **168 hours** (7 days) to match app cookies.
5. Paste URL, publishable key, and secret key into **both** `player-app/.env` and `admin-app/.env`. Add `http://localhost:5174/auth/callback` to the redirect allowlist for the admin app, and set the session time-box to **720 h (30 days)** so admin cookies outlive the player 7-day default.

### 4. Generate PWA icons (optional)

```bash
yarn icons:player
```

Writes shuttlecock brand icons to `player-app/static/`.

### 5. Run the player app

```bash
yarn dev:player
```

Open `http://localhost:5173` (or your `PORT`). Unauthenticated users are redirected to `/login`; after login, to `/profile`.

## Scripts

Run from the **repo root**:

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `yarn dev:player` / `yarn dev:admin`     | Start dev server (player `5173` / admin `5174`) |
| `yarn build:player` / `yarn build:admin` | Production build                  |
| `yarn check:player` / `yarn check:admin` | Typecheck / svelte-check         |
| `yarn test:player` / `yarn test:admin`   | Run Vitest                       |
| `yarn lint`         | ESLint                            |
| `yarn lint:fix`     | ESLint with auto-fix              |
| `yarn format`       | Prettier format (whole repo)      |
| `yarn format:check` | Prettier check (CI)               |
| `yarn icons:player` / `yarn icons:admin` | Regenerate PWA icon PNGs          |
| `yarn db:push`      | Push migrations to linked Supabase project |
| `yarn db:migration:new <name>` | Create a new migration file |
| `yarn supabase:link` | Alias for `yarn supabase link`   |
| `yarn supabase:start` | Start local Supabase stack        |
| `yarn supabase:stop`  | Stop local Supabase stack         |

Player-only commands from `player-app/`:

```bash
yarn workspace player-app dev
yarn workspace player-app test
```

## Player app routes

| Route            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `/login`         | Email/phone + password; OAuth                       |
| `/register`      | Create account (display name, identifier, password) |
| `/`              | Home: my sessions, featured sessions, nearby clubs  |
| `/sessions`      | Browse / join upcoming sessions (distance-sorted)   |
| `/sessions/history` | Past sessions (filters, pagination)              |
| `/sessions/[id]/live` | Live session: court grid, invites, leave, payment |
| `/sessions/[id]/live/match/[matchId]` | In-match: submit/confirm scores        |
| `/matches/history` | Cross-session match history (filters, stats)     |
| `/profile`       | Display name, avatar, credentials; fees + transactions |
| `/auth/callback` | OAuth session exchange                              |
| `/logout`        | Sign out                                            |

API (bottom sheets): `/api/sessions/[id]`, `/api/clubs/[id]`.

## Admin app routes

| Route            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `/login`         | Email/phone + password; OAuth (no register)         |
| `/`              | Super-admin home: clubs list + quick actions        |
| `/dashboard`     | Club-admin home: ongoing/upcoming sessions          |
| `/clubs/new`, `/clubs/[id]` | Create club / club settings + admins     |
| `/users`, `/users/[id]` | User search, role view, ban/delete (super admin) |
| `/sessions`, `/sessions/new` | Upcoming sessions / create session           |
| `/sessions/history` | Past sessions                                    |
| `/sessions/[id]`, `/sessions/[id]/edit` | Detail + roster / edit session      |
| `/sessions/[id]/control` | Live control: matchmaking, settlement, close     |
| `/sessions/[id]/control/match/[matchId]` | Per-match: shuttles, score resolve      |
| `/transactions`  | Payment + cancellation-fee history                  |
| `/profile`       | Display name, avatar, credentials                     |
| `/auth/callback` | OAuth session exchange                              |
| `/logout`        | Sign out                                            |

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for full phase specs.

## Architecture (Phase 1)

```text
Browser (SvelteKit PWA)
  → form actions / hooks.server.ts (@supabase/ssr, HttpOnly cookies)
  → Supabase Auth + Postgres (profiles, RLS, Storage)
  → Service role (server only): register, phone→email lookup, admin.createUser
```

Phone-only users get a synthesized auth email (`{e164}@phone.ph-badminton.local`); no SMS. See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for locked auth decisions and the full target data model.

## Contributing / next steps

1. Read [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) before starting a new phase, and [AGENTS.md](AGENTS.md) for cross-cutting rules (RPC-only writes, Realtime, money formatting, shared UI).
2. Implement the phase scope in `player-app/` and/or `admin-app/` (promote shared UI to `shared/ui/`).
3. Update phase status and notes in the plan doc when done.

Next up: **Phase 6** — ELO engine + history + leaderboard, then **Phase 8** — push notifications + offline polish.

## License

Private project — no license specified.
