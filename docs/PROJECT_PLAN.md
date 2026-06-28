# PH Badminton Club - Project Plan

A mobile-first PWA for organizing 2v2 badminton club sessions: player auth/profile, ELO ranking, geo-discovered sessions, auto/manual matchmaking, peer-confirmed scoring, and free self-generated PromptPay split-cost payments. Everything runs on free tiers.

> This is the living big-picture plan. Each phase below has a status. When starting a new phase, read this file first for context, implement, then update the phase status and notes here.

## Monorepo layout

```
ph-badminton-club-project/
├── docs/PROJECT_PLAN.md      # this file
├── shared/ui/                # Shared dashboard UI (both apps import via @repo/ui)
├── supabase/                 # Shared DB schema & migrations
├── player-app/               # Player PWA (SvelteKit) — Phase 1 done
├── admin-app/                # Admin PWA (SvelteKit) — Phase 2a/2b
└── package.json              # Yarn workspaces root
```

- **Player app:** `player-app/` — auth, profile, sessions, matches, payments
- **Admin app:** `admin-app/` — super-admin club management (Phase 2a); club-admin dashboard/settings (Phase 2b); session create/list/detail + player join management (Phase 3, in progress)
- **Shared backend:** Supabase migrations in `supabase/` (repo root); both apps use the same Supabase project

**Root scripts:** `yarn dev:player`, `yarn dev:admin`, `yarn build:player`, `yarn build:admin`, `yarn check:player`, `yarn check:admin`, `yarn test:player`, `yarn test:admin`

## Tech stack tree (all free tier)

- **Frontend / PWA**
  - SvelteKit (Svelte 5 runes) + Vite
  - `@vite-pwa/sveltekit` - service worker, manifest, installable, offline shell
  - TailwindCSS v4 + shared dashboard UI in `shared/ui/` (hero banners, launcher tiles, cards)
  - Web Push API for match/score notifications (graceful fallback to in-app realtime)
- **Backend / data (Supabase free tier)**
  - Postgres + **PostGIS** (session location + nearby queries)
  - Supabase Auth (email/password + Google + Facebook OAuth)
  - Row Level Security (RLS) for player vs club-admin vs super-admin
  - Realtime (live match offers, score confirmations, session updates)
  - Edge Functions (Deno) for trusted logic: matchmaking, ELO calc, payment summary
- **Payments**
  - `promptpay-qr` (npm) generates EMVCo PromptPay payload client-side -> render QR with `qrcode`. No gateway, no fees. Admin manually confirms the transfer.
- **Hosting (free)**
  - Vercel or Cloudflare Pages for the SvelteKit app; Supabase hosts DB/auth/functions
- **Tooling**
  - TypeScript, Zod (validation at trust boundaries), Vitest (logic tests), Playwright (optional e2e later)

## UI design system (shared — both apps)

Both `player-app` and `admin-app` import shared UI from `shared/ui/` via the `@repo/ui` alias (configured in each app's `svelte.config.js`). Styles live in `shared/ui/styles/design-system.css`, imported from each app's `app.css`. Tailwind scans `shared/ui/**` via `@source`.

### Visual language

- **Mobile-first** shell: `max-w-lg`, light slate background, purple brand (`#964ac0`)
- **Rounded surfaces**: prefer `rounded-3xl` for hero/cards/tiles (softer than old `rounded-2xl` lists)
- **Motion**: tile hover lift (`-translate-y-0.5`), icon scale on hover; respect `prefers-reduced-motion`

### Core patterns

| Pattern | Component / class | Use for |
| ------- | ----------------- | ------- |
| **Dashboard hero** | `DashboardHero` / `.app-hero` | Page welcome banner — gradient purple, white text, eyebrow + title + subtitle |
| **Launcher tile** | `DashboardTile` / `.app-tile` | Big icon + label grid actions (club settings, browse clubs, create club) |
| **Section label** | `SectionHeading` / `.app-section-heading` | Uppercase “Quick actions”, “All clubs”, etc. |
| **Content card** | `AppCard` / `.app-card-padded` | Forms, settings sections, login boxes |
| **Empty state** | `EmptyState` / `.app-empty` | No data placeholders |
| **Muted panel** | `.app-muted-panel` | Secondary info (account details on profile) |

### DashboardTile spec

- Gradient icon box: `from-brand-500 to-brand-700`, 64×64 default / 80×80 `large`
- Supports `href` (link) or `onclick` (button) — e.g. player club browse opens bottom sheet
- Optional `badge` (e.g. “Inactive”), `description` subtitle
- Grid: `grid-cols-2 gap-4`; single primary action may use `grid-cols-1` + `large`

### Brand tokens (`@theme` in each app `app.css`)

`brand-50` … `brand-900` including `brand-300`, `brand-400`, `brand-500` for gradients and shadows.

### When adding new screens

1. Start with `DashboardHero` (or compact heading for dense forms)
2. Primary actions → `DashboardTile` grid under `SectionHeading`
3. Forms / detail blocks → `AppCard`
4. Reuse icons from `shared/ui/icons/` before adding app-local duplicates

## Role hierarchy

```mermaid
flowchart TD
  superAdmin[Super Admin] -->|creates club, sets max sessions| club[Club]
  superAdmin -->|assigns| clubAdmin[Club Admin]
  clubAdmin -->|manages settings, creates| session[Session]
  clubAdmin -->|matchmaking, reviews disputes| match[Match]
  player[Player] -->|joins| session
  player -->|plays, logs score| match
```

## Data model (Postgres) - full target

Single source of truth; ELO is global per player for v1 (simplest correct model). Tables are introduced incrementally per phase; the full target is:

- `profiles` (1:1 with `auth.users`): display_name, avatar_url, email, phone (unique), app_role (player|club_admin|super_admin)
- `clubs`: name, owner_id (super admin), max_active_sessions
- `club_admins`: club_id, user_id (membership = who can admin a club)
- `player_ratings`: user_id, elo (default 1500), matches_played, wins, losses, status (active|suspended)
- `sessions`: club_id, host_id, name, description, start_at, end_at, venue_name, latitude, longitude, court_count, court_fee_per_hour, shuttle_id, shuttle_price_per_each, max_players, min_players, match_score_type, match_type, **cancellation_fee**, **max_buffer**, status (open|in_progress|closed|cancelled). Target (not yet): `geography(Point)`, elo_min, elo_max, session-level PromptPay.
- `session_players`: session_id, user_id, status (**waiting|queued|confirmed|rejected|cancelled|left**), fee_owed, joined_at, decided_at, left_at. Writes via RPC only (`join_session`, `cancel_session_membership`, `confirm_session_player`, `reject_session_player`, `leave_session`).
- `session_courts`: session_id, court_number, status (idle|occupied)
- `matches`: session_id, court_number, mode (auto|manual), status (offered|accepted|in_progress|awaiting_score|disputed|completed|cancelled), started_at, ended_at
- `match_players`: match_id, user_id, team (a|b), accepted (bool)
- `match_results`: match_id, score_a, score_b, submitted_by, status (pending|confirmed|disputed|admin_resolved)
- `match_result_votes`: match_id, user_id, vote (accept|reject) -- needs 3 of 4 to confirm
- `match_shuttle_usage`: match_id, shuttle_count (default 1, admin can add)
- `elo_history`: user_id, match_id, elo_before, elo_after, delta
- `payments`: session_id, user_id, games_count, shuttle_count, court_share, shuttle_share, total_amount, qr_payload, status (pending|submitted|approved)

## Key flows

### 1. Session discovery + join

**Implemented (Phase 3):** Player browses upcoming open sessions at `/sessions`, sorted client-side by haversine distance (stored user location in localStorage) then soonest `start_at`. Player opens detail bottom sheet, joins via `join_session` RPC → **waiting** (counts toward `max_players`) or **queued** (overflow up to `max_buffer`). Club admin confirms/rejects waiting players on session detail from **15 min before start until end** (page refresh, no realtime yet). Player can cancel waiting (free if >1 hr before start; else `fee_owed = cancellation_fee`, recorded only — collection is Phase 7) or cancel queued anytime (free). One non-overlapping session membership at a time; blocked while any `fee_owed > 0`.

**Target (later):** PostGIS `ST_DWithin` for server-side geo filter; Supabase Realtime for join notifications; ELO min/max gates.

```mermaid
sequenceDiagram
  participant P as Player (PWA)
  participant DB as Supabase
  participant A as Club Admin
  P->>DB: list upcoming sessions + join_session RPC
  DB-->>P: status waiting or queued
  A->>DB: confirm_session_player / reject_session_player (15m pre-start..end)
  DB-->>P: status confirmed or rejected
  Note over P,DB: cancel frees slot; oldest queued auto-promoted to waiting
```

### 2. Matchmaking + accept

Admin picks an idle court + mode. Auto mode: an Edge Function pairs active players by closest ELO into balanced 2v2 teams (team rating = avg of pair). Manual mode: admin hand-picks 4. Offer pushed to all 4; all must accept -> match `in_progress`, court -> occupied.

```mermaid
sequenceDiagram
  participant A as Admin
  participant FN as Edge Function (matchmake)
  participant DB as Supabase
  participant P as 4 Players
  A->>FN: create match (court, auto|manual)
  FN->>DB: build balanced teams, status=offered
  DB-->>P: realtime/push: match offer (court, teammates)
  P->>DB: accept (match_players.accepted=true)
  DB->>DB: all 4 accepted -> status=in_progress, court=occupied
```

### 3. Score logging + peer confirmation + dispute

One player submits score -> other 3 vote. >= 3/4 accept (incl. submitter) -> confirmed, ELO calc runs. If rejected (fails 3/4) -> `disputed`, players cannot start a new match (SUSPENDED) until a club admin resolves.

```mermaid
flowchart TD
  submit[Player submits score] --> votes{>= 3 of 4 accept?}
  votes -->|yes| confirmed[Result confirmed]
  confirmed --> elo[ELO calc + history + W/L]
  votes -->|no| disputed[Disputed -> players suspended]
  disputed --> admin[Admin reviews + sets winner]
  admin --> elo
  elo --> freeCourt[Court freed, players active again]
```

### 4. ELO (doubles)

- Team rating = average of the two players' ELO.
- Expected_A = 1 / (1 + 10^((R_B - R_A)/400)); winner score 1, loser 0.
- delta = K \* (actual - expected), K ~ 32 (configurable, lower at high games_played).
- Apply same delta to both players on a team; write `elo_history` + update `player_ratings`. Recompute rank ordering for the club leaderboard.

### 5. Payment on leave (free PromptPay)

On leave/close, an Edge Function sums the player's games and shuttle usage:

- court_share = court_fee_per_hour prorated across the games the player joined
- shuttle_share = sum over player's matches of (shuttle_price \* shuttle_count / 4)
- total -> generate PromptPay payload (`promptpay-qr` from admin's phone/id + amount) -> render QR -> player pays in banking app -> player marks submitted -> admin confirms -> status approved -> player may leave.

## Module mapping (scaffold -> build)

- **Player (`player-app/`):** Auth/Profile, Ranking/ELO, Session/Match, Match History, Payment
- **Admin (`admin-app/`):** Admin panel (reuse auth), Admin hierarchy (clubs/admins), Session management, Match management (assign, add shuttles, resolve disputes)

Player routes under `player-app/src/routes/`; admin routes under `admin-app/src/routes/` when scaffolded. Shared Supabase client + typed DB in each app's `src/lib/`.

## Global notes / accepted simplifications

- PWA "geofencing" = foreground GPS proximity only (no background triggers). Covers courtside discovery.
- iOS web push requires installed-to-home-screen (16.4+); in-app realtime is the always-on fallback.
- ELO is global, not per-club, for v1.
- PromptPay is self-generated + manually confirmed (no auto reconciliation).

## Phased roadmap & status

| Phase | Scope                                                                                         | Status      |
| ----- | --------------------------------------------------------------------------------------------- | ----------- |
| 1     | Player Auth & Profile (email/phone + password, Google, Facebook, 7-day session, profile edit) | Completed   |
| 2     | DB schema + RLS + roles + clubs / admin hierarchy                                             | In progress (super admin subset done) |
| 3     | Sessions (CRUD, geo discovery, join/waitlist/queue, admin confirm)                             | In progress (admin create + player join done) |
| 4     | Matchmaking (manual then auto) + match accept + realtime offers                               | Not started |
| 5     | Scoring + peer confirmation + dispute/suspend + admin resolve                                 | Not started |
| 6     | ELO engine + history + leaderboard                                                            | Not started |
| 7     | Payment summary + PromptPay QR + admin confirm                                                | Not started |
| 8     | Push notifications + offline polish + final QA                                                | Not started |

---

## Phase 1 - Player Auth & Profile (detailed spec)

First MVP module: register/login with email OR phone + password, plus Google & Facebook, 7-day sessions, and a profile page to edit display name + avatar. Email, phone, and password are read-only this phase (changed by admin in a later phase).

### Locked decisions

- Email + password is the real underlying credential. Phone-only users get a deterministic synthesized internal email (`<e164phone>@phone.ph-badminton.local`); no SMS, fully free.
- Register requires: display name + password + (email OR phone, at least one; both unique).
- No email verification - instant login after register (user created via admin API with `email_confirm: true`, so it works regardless of dashboard toggle).
- Session lasts 7 days (auth cookie `maxAge` + Supabase session time-box).
- Profile editable: display name, avatar. Read-only: email, phone, password (request admin).
- OAuth: Google + Facebook.

### Architecture

```mermaid
flowchart TD
  browser[SvelteKit PWA] -->|form actions| hooks[hooks.server.ts + @supabase/ssr]
  hooks -->|anon client, cookies| sb[Supabase Auth + Postgres]
  hooks -->|service role, server only| admin[Auth admin API + phone lookup]
  sb -->|trigger on auth.users insert| profiles[(profiles)]
  browser -->|OAuth redirect| sb
```

Auth runs in SvelteKit server form actions using `@supabase/ssr` (sets HttpOnly cookies). The service-role key stays server-only (`$env/static/private`) and is used for: uniqueness pre-checks, `admin.createUser`, and resolving phone -> account email before sign-in.

### Phase 1 data model (`supabase/migrations/0001_init.sql`)

- `profiles`: `id uuid PK references auth.users on delete cascade`, `display_name text not null`, `avatar_url text`, `email text`, `phone text unique`, `app_role text default 'player'`, `created_at`, `updated_at`
- `handle_new_user()` trigger on `auth.users` insert -> inserts profile from `raw_user_meta_data` (covers password AND OAuth signups uniformly): display_name from `display_name`/`full_name`/`name`, avatar from `avatar_url`/`picture`, phone from metadata, email left null when the auth email is the synthesized `@phone.ph-badminton.local` domain.
- `lock_readonly_fields()` BEFORE UPDATE trigger: rejects changes to `phone`/`email`/`app_role` unless caller is admin (enforces "request admin" rule).
- RLS: select own profile; update own profile (read-only fields still blocked by trigger).
- Storage: public `avatars` bucket; insert/update policy restricted to a folder prefixed by the user's id.

### Auth logic (`player-app/src/lib/server/auth.ts`)

- `normalizePhone(input)` -> E.164 for Thailand (`0xxxxxxxxx` -> `+66xxxxxxxxx`, accept existing `+`). `ponytail:` basic TH-only normalization, upgrade to libphonenumber if more countries needed.
- `isEmail(identifier)` to branch login.
- `resolveLoginEmail(identifier)`: if email, use as-is; if phone, normalize -> query `profiles` by phone (service role) -> `admin.getUserById` -> return auth email. `ponytail:` pre-auth phone lookup allows registration probing; rate-limit later.
- Register: validate (Zod), normalize phone, check email/phone uniqueness, build auth email (real email or synthesized), `admin.createUser({ email, password, email_confirm: true, user_metadata })`, then `signInWithPassword` to start the session.

### Routes (`player-app/src/routes`)

- `(auth)/register/+page.svelte` + `+page.server.ts` - display name, password, one identifier field (email or phone).
- `(auth)/login/+page.svelte` + `+page.server.ts` - single identifier field (auto-detect email/phone) + password; Google/Facebook buttons.
- `auth/callback/+server.ts` - exchanges OAuth code for session, redirects to profile.
- `(player)/profile/+page.svelte` + `+page.server.ts` - edit display name + avatar upload (Supabase Storage); email/phone shown read-only with a "contact admin to change" note.
- `logout/+page.server.ts` - signOut.
- `+layout.server.ts` / `+layout.svelte` / `hooks.server.ts` - supabase client, session load, guard protected `(player)` routes.

### Scaffold + config

- Init SvelteKit (TS) + Tailwind + `@vite-pwa/sveltekit` (minimal manifest/service worker; full offline polish in Phase 8).
- Deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`; dev: `vitest`.
- Env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`), `SUPABASE_SECRET_KEY` (`sb_secret_...`, server-only).
- Auth cookie `maxAge = 60*60*24*7`.

### Check (one runnable test)

- `player-app/src/lib/server/auth.test.ts` (Vitest): `normalizePhone` cases (`0812345678` -> `+66812345678`, idempotent on `+66...`) and `isEmail` detection.

### Manual steps (Supabase dashboard)

- Create the Supabase project; copy URL + anon + service_role keys into `player-app/.env`.
- Auth > Providers: enable Google and Facebook (paste each provider's client id/secret; redirect to `/auth/callback`).
- Auth > Sessions: set time-box to 168 hours (7 days).
- Run the migration (Supabase CLI or SQL editor).

### Out of scope (Phase 1)

ELO, sessions, matches, payments, push notifications, self-service email/phone/password change.

---

## Phase 2a - Admin app super admin (detailed spec)

Super-admin bootstrap and club management in `admin-app/`. Club-admin admin-app access is deferred to Phase 2b; assigned club admins exist in DB but cannot sign in to admin-app yet.

### Role capabilities (v1)

| Role | Admin-app access | Capabilities |
| ---- | ---------------- | ------------ |
| **Super Admin** | Yes | Create/update/delete clubs, set max active sessions, assign/remove club admins, search all profiles |
| **Club Admin** | No (Phase 2b) | Row in `club_admins`; `app_role` synced to `club_admin` when assigned |
| **Player** | No | — |

### Bootstrap first super admin

1. User registers via player-app (normal account).
2. Set `MASTER_KEY_SHA256` in `admin-app/.env` (SHA-256 hex of a strong raw secret — never store the raw key in env).
3. One-time POST to the backdoor endpoint:

```bash
curl -X POST http://localhost:5174/api/internal/promote-superadmin \
  -H "Content-Type: application/json" \
  -H "x-master-key: YOUR_RAW_SECRET" \
  -d '{"userId":"USER_UUID_HERE"}'
```

4. That user signs in at admin-app (`yarn dev:admin`, port 5174).

Generate hash: `node -e "console.log(require('crypto').createHash('sha256').update('your-secret').digest('hex'))"`

### Phase 2a data model (`supabase/migrations/0003_clubs_admin.sql`)

- `clubs`: `name`, `description`, `max_active_sessions`, `owner_id` (creating super admin)
- `club_admins`: `club_id`, `user_id`, `assigned_by`
- `sync_club_admin_role()` trigger: promote `player` → `club_admin` on assign; demote to `player` when removed from last club; never changes `super_admin`
- RLS: super admin full CRUD on `clubs` / `club_admins`; super admin can select all `profiles` (user pool search)

### Admin-app env (`admin-app/.env.example`)

Same Supabase keys as player-app, plus:

- `PORT=5174`
- `MASTER_KEY_SHA256` — hex SHA-256 of bootstrap secret (server-only)
- Auth cookie `maxAge` = 30 days (`SESSION_MAX_AGE` in `admin-app/src/lib/types/auth.ts`)

### Supabase dashboard (manual)

- Auth > URL configuration: add redirect `http://localhost:5174/auth/callback` (and production admin URL when deployed).
- Auth > Sessions: set time-box to **720 hours (30 days)** so admin refresh tokens outlive the player-app 7-day default if both apps share one project (use the longer value project-wide).
- Run `yarn db:push` after pulling migration `0003_clubs_admin.sql`.

### Admin routes (`admin-app/src/routes`)

- `(auth)/login/` — email/phone + password + Google/Facebook; no register
- `auth/callback/+server.ts` — OAuth session exchange
- `api/internal/promote-superadmin/+server.ts` — master-key backdoor (not linked from UI)
- `(admin)/` — club list
- `(admin)/clubs/new/` — create club
- `(admin)/clubs/[id]/` — edit club, assign/remove admins, delete club
- `hooks.server.ts` — super-admin-only guard (non-super-admins signed out)

### Out of scope (Phase 2a)

Club-admin admin-app UI, session/match management, demote super admin via UI, rate limiting on backdoor endpoint.

---

## Phase 2b - Club admin dashboard and settings (detailed spec)

Club admins can sign in to `admin-app`, land on `/dashboard`, and open club settings from launcher tiles.

### Role capabilities (updated)

| Role | Admin-app access | Capabilities |
| ---- | ---------------- | ------------ |
| **Super Admin** | Yes (`/`) | All clubs, create/delete, assign admins, full club settings |
| **Club Admin** | Yes (`/dashboard`) | Assigned clubs only; name/description + shuttles, PromptPay, location |
| **Player** | No | — |

### Admin routes (Phase 2b additions)

- `(admin)/dashboard/` — club admin home (hero + launcher tiles)
- `(admin)/clubs/[id]/` — club settings (role-gated sections)
- `hooks.server.ts` — allows `club_admin`; login → `/dashboard` for club admin, `/` for super admin

### Data (`0008_club_settings.sql`)

- `clubs`: `promptpay_type`, `promptpay_target`, `latitude`, `longitude`
- `club_shuttles`: inventory CRUD (speed 75/76, pricing; per-each computed in UI)
- RLS: `is_club_admin_of()` for club admin read/update; trigger guards restricted columns

### UI

Uses shared dashboard design system (see **UI design system** above): `DashboardHero`, `DashboardTile`, `AppCard` on dashboard, settings, login, and profile screens.

---

## Phase 3 — Sessions (admin create + player join)

Admin-app session module: **create + list + detail + participant management + super-admin force-end**. Player-app: **browse upcoming sessions + join waiting list / buffer queue**.

### Role capabilities (sessions)

| Role | Sessions access | Capabilities |
| ---- | --------------- | ------------ |
| **Super Admin** | `/sessions`, `/sessions/[id]` | View all sessions; **force end** only (danger zone) |
| **Club Admin** | `/sessions`, `/sessions/new`, `/sessions/[id]` | Create sessions for assigned clubs; list own club sessions; **confirm/reject waiting players** (15 min before start → session end); observe others' sessions (read-only detail) |
| **Player** | `/sessions`, `/api/sessions/[id]` | Browse upcoming sessions (distance-sorted when location granted); view detail; join / cancel / leave via RPC form actions |

### Admin routes (Phase 3)

- `(admin)/sessions/` — upcoming + past session lists
- `(admin)/sessions/new/` — create form (club admin / super-admin in club workspace only)
- `(admin)/sessions/[id]/` — session detail + waiting list, buffer queue, confirmed players; super-admin force-end action

### Player routes (Phase 3)

- `(player)/sessions/` — upcoming session list (`depends('app:sessions')`)
- `(player)/` — home tile linking to `/sessions`
- `api/sessions/[id]/` — JSON session detail for `SessionDetailSheet`
- Form actions on `/sessions`: `join`, `cancel`, `leave` → Supabase RPCs

### Data (`0012`–`0016` migrations)

- `clubs.venue_name` — default venue label prefilled on session create
- `club_shuttles` — dropped `speed`; unique `(club_id, name)`; fields: brand (`name`), `original_price`, tube price (`price`), amount per tube (`number_per_box`); per-each computed in UI
- `sessions`: `club_id`, `host_id`, `name`, `description` (sanitized HTML), `status` (`open` \| `in_progress` \| `closed` \| `cancelled`), `start_at`, `end_at`, `venue_name`, `latitude`, `longitude`, `max_players`, `min_players`, `court_count`, `court_fee_per_hour`, `shuttle_id`, `shuttle_price_per_each`, `match_score_type` (15 \| 21), `match_type` (`one_round` \| `two_round`), **`cancellation_fee`**, **`max_buffer`**
- `session_players` (`0016_session_players.sql`): membership rows; status `waiting` \| `queued` \| `confirmed` \| `rejected` \| `cancelled` \| `left`; `fee_owed` for late-cancel recording; partial unique index (one active row per user per session). All writes through security-definer RPCs.

All session datetimes stored as `timestamptz` (UTC); UI inputs/display use the **viewer's device timezone** (see `shared/ui/datetime.ts`).

Create enforces club `max_active_sessions` (counts sessions with status `open` or `in_progress`).

Join rules (RPC-enforced): capacity = `waiting` + `confirmed` vs `max_players`; overflow → `queued` up to `max_buffer`; no overlapping memberships; block join if any `fee_owed > 0`; auto-promote oldest queued when a waiting slot frees.

### Payment formulas (locked — used in Phase 7)

When a player leaves or a session ends, per-player charges:

- **Court share** = `court_fee_per_hour × duration_hours × court_count ÷ active_players`
  - Example: 200 THB/hr × 4 hrs × 4 courts ÷ 10 players = **320 THB**
- **Shuttle share** = `(shuttle_price_per_each ÷ 4) × games_played_by_player`
  - Example: (80 ÷ 4) × 5 games = **100 THB**
- **Session total** = court_share + shuttle_share (example → **420 THB**)

`shuttle_price_per_each` is set per session (may differ from club default for markup).

### Deferred (not Phase 3)

- Session edit/cancel by host
- Min-players auto-cancel 15 min before start
- PostGIS server-side nearby filter (client haversine only today)
- Realtime join notifications to admin
- ELO min/max on join
- Court assignment infographic / match flow
- Actual payment QR generation and collection of `fee_owed`

### UI notes

- Description: TipTap rich text (admin) → sanitized HTML stored → `RichTextDisplay` (shared) on detail
- Venue: prefilled from club `venue_name` + lat/lng; editable per session via `MapPinPicker`
- Datetime helpers: `shared/ui/datetime.ts` (UTC storage, device-timezone display)
- Player session list: `DashboardTile` grid; detail via `SessionDetailSheet` (bottom sheet, mirrors `ClubDetailSheet`)
- Player geo sort: `player-app/src/lib/sessions/nearby.ts` + `shared/ui/geolocation.ts` (localStorage location)
- Admin participants: waiting list with confirm/reject (gated to action window), buffer queue, confirmed list

### Check (runnable tests)

- `player-app/src/lib/sessions/nearby.test.ts` — distance + soonest tie-break
- `supabase/tests/session_players_self_check.sql` — documents RPC smoke checks after `db:reset`

