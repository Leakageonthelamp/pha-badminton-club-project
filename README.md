# PH Badminton Club

A mobile-first monorepo for organizing 2v2 badminton club sessions: player auth and profiles, ELO ranking, geo-discovered sessions, matchmaking, peer-confirmed scoring, and free PromptPay split-cost payments. The goal is a full club workflow on **free tiers** (Supabase, Vercel/Cloudflare Pages, client-side PromptPay QR).

> **Living plan:** [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) — architecture, data model, flows, and phased roadmap.

## Current status

| Phase | Scope                                   | Status        |
| ----- | --------------------------------------- | ------------- |
| 1     | Player auth & profile                   | **Completed** |
| 2     | DB schema, RLS, clubs & admin hierarchy | Not started   |
| 3     | Sessions (geo discovery, join/approve)  | Not started   |
| 4     | Matchmaking + realtime offers           | Not started   |
| 5     | Scoring, disputes, admin resolve        | Not started   |
| 6     | ELO engine + leaderboard                | Not started   |
| 7     | Payment summary + PromptPay QR          | Not started   |
| 8     | Push notifications + offline polish     | Not started   |

**Shipped today (Phase 1 — `player-app`):**

- Register / login with **email or Thai phone** + password
- **Google & Facebook** OAuth
- 7-day session cookies
- Profile: edit display name & avatar; email / phone / password read-only
- Installable **PWA** (manifest, service worker, app icons)
- Mobile-oriented UI (page transitions, back navigation, system fonts)

**Not yet built:** sessions, matches, ELO, payments, admin panel (`admin-app` is a placeholder).

## Monorepo layout

```
ph-badminton-club-project/
├── docs/PROJECT_PLAN.md    # Big-picture plan & phase specs
├── supabase/                 # Shared DB schema & migrations (both apps)
├── player-app/               # Player PWA (SvelteKit) — active
├── admin-app/                # Admin PWA — placeholder
├── package.json              # Yarn workspaces root
└── README.md
```

Supabase migrations live in `supabase/` at the repo root. Both `player-app` and `admin-app` connect to the same Supabase project via their own `.env` files (same URL and keys).

## Tech stack

| Layer           | Choices                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| Frontend        | SvelteKit 5, Svelte runes, Tailwind CSS 4, `@vite-pwa/sveltekit`            |
| Backend         | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions — later phases) |
| Validation      | Zod                                                                         |
| Tests           | Vitest                                                                      |
| Package manager | Yarn 4 (Berry)                                                              |

**Planned (later phases):** PostGIS, Web Push, PromptPay QR (`promptpay-qr`), Edge Functions for matchmaking / ELO / payments.

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

Copy the example env file and fill in your Supabase keys:

```bash
cp player-app/.env.example player-app/.env
```

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
     yarn db:push
     ```
   - **Dashboard:** paste `supabase/migrations/0001_init.sql` into the SQL editor.
3. **Auth → Providers:** enable Google and Facebook; set redirect URL to `http://localhost:{PORT}/auth/callback` (and your production URL later).
4. **Auth → Sessions:** set time-box to **168 hours** (7 days) to match app cookies.
5. Paste URL, publishable key, and secret key into `player-app/.env` (and `admin-app/.env` when that app is scaffolded).

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
| `yarn dev:player`   | Start player PWA dev server       |
| `yarn build:player` | Production build (player)         |
| `yarn check:player` | Typecheck / svelte-check (player) |
| `yarn test:player`  | Run Vitest (player)               |
| `yarn lint`         | ESLint (player-app)               |
| `yarn lint:fix`     | ESLint with auto-fix              |
| `yarn format`       | Prettier format (whole repo)      |
| `yarn format:check` | Prettier check (CI)               |
| `yarn icons:player` | Regenerate PWA icon PNGs          |
| `yarn dev:admin`    | Admin app (not scaffolded yet)    |
| `yarn db:push`      | Push migrations to linked Supabase project |
| `yarn db:migration:new <name>` | Create a new migration file |
| `yarn supabase:start` | Start local Supabase stack        |
| `yarn supabase:stop`  | Stop local Supabase stack         |

Player-only commands from `player-app/`:

```bash
yarn workspace player-app dev
yarn workspace player-app test
```

## Player app routes (Phase 1)

| Route            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `/login`         | Email/phone + password; OAuth                       |
| `/register`      | Create account (display name, identifier, password) |
| `/profile`       | Edit display name & avatar (protected)              |
| `/auth/callback` | OAuth session exchange                              |
| `/logout`        | Sign out                                            |

## Architecture (Phase 1)

```text
Browser (SvelteKit PWA)
  → form actions / hooks.server.ts (@supabase/ssr, HttpOnly cookies)
  → Supabase Auth + Postgres (profiles, RLS, Storage)
  → Service role (server only): register, phone→email lookup, admin.createUser
```

Phone-only users get a synthesized auth email (`{e164}@phone.ph-badminton.local`); no SMS. See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for locked auth decisions and the full target data model.

## Contributing / next steps

1. Read [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) before starting a new phase.
2. Implement the phase scope in `player-app/` and/or `admin-app/`.
3. Update phase status and notes in the plan doc when done.

Phase 2 will add clubs, admin roles, and expanded RLS on top of the existing `profiles` table.

## License

Private project — no license specified.
