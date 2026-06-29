# AGENTS.md

Monorepo with two SvelteKit apps that share UI through `shared/`.

```
shared/ui/
  components/   reusable presentational components
  icons/        svg icon components
  styles/       design-system.css (tokens + base + component classes)
  toast/        toast store (toast.svelte.ts)
player-app/     player-facing app
admin-app/      club-admin-facing app
```

Both apps import shared UI via the `@repo/ui` alias (configured in each
`svelte.config.js`, pointing at `../shared/ui`). Example:

```ts
import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
import UserIcon from '@repo/ui/icons/UserIcon.svelte';
import { toast } from '@repo/ui/toast/toast.svelte';
```

## Before writing a component, function, icon, or style — check this order

1. **Does it already exist in `shared/`?** Reuse it via `@repo/ui`. Do not
   re-create it locally. Grep `shared/ui/` first.
2. **Does it exist locally in the app you're editing?** Reuse that.
3. **It's new — will BOTH apps use it (now or obviously soon)?**
   - **Yes →** create it in `shared/ui/` and import via `@repo/ui` from both apps.
   - **No (single app) →** create it in that app's `src/lib/`.

When you find the same code duplicated in both apps, that's a signal to promote
it to `shared/` (delete both local copies, repoint imports to `@repo/ui`).

## Rule for what may live in `shared/ui/`

A component belongs in `shared/` only if it is **self-contained** or depends
**only on other `shared/ui` modules**. Shared files must NOT import `$lib`,
`$app`, or `$env` — those resolve per-app and make shared code fragile. Inside
`shared/`, import siblings with relative paths (e.g. `../icons/Foo.svelte`).

If a UI component is identical across apps but depends on app-local domain logic
(`$lib/validation`, `$lib/images`, `$lib/forms`, `$lib/types`, app config),
keep it per-app. App-specific branding stays per-app too.

### Currently kept per-app on purpose

- `AppLogo` — different logo/SVG per app (branding).
- `ServiceUnavailable` — renders the app-specific `AppLogo` + app config.
- `ProfileMenu` — admin shows a role label; deps (`forms/submitting`,
  `types/auth`) differ between apps.
- `PageTransition` — direction logic depends on app-specific `navigation/back`.
- `IdentifierField` — depends on `$lib/validation/identifier`.
- `AvatarCropModal` — depends on `$lib/images/cropAvatar`.
- Single-app components: `MapPinPicker`, `UpcomingSessionsPanel`, `SessionListLink`, `SessionForm`,
  `SessionCancellationFees`, `SessionHistoryDetail` (admin); `ClubDetailSheet`, `SessionDetailSheet`,
  `DisplayNameField`, `PwaHead`, `PwaPrompts`, `PaymentQr`, `CancellationFeeModal`,
  `PlayerTransactionsPanel` (player). PromptPay QR (`PaymentQr`, depends on `promptpay-qr` + `qrcode`)
  lives **player-only** — admin never renders QR.

### Shared UI modules (non-component)

- `@repo/ui/datetime` — UTC storage, device-timezone display/input conversion; `formatUptime` (live timer)
- `@repo/ui/sessionStatus` — live player activity status (`derivePlayerLiveStatus`, `playerLiveStatusLabel`/`BadgeClass`, `clampIdleSince`/`idleSinceSortKey` for idle timer)
- `@repo/ui/richText` — `richTextPlainText`, `richTextExcerpt`, `isRichTextEmpty` (list cards + empty checks)
- `@repo/ui/geolocation` — stored user location helpers (player distance sort)
- `@repo/ui/payments` — `computeCourtShare`, `formatThb` (THB money formatting), payment/leave/fee status labels
- `@repo/ui/transactions` — unified transaction filter/status helpers (both apps' transaction lists)
- `@repo/ui/matches` — match status labels, team split, score formatting; **rally game score validation**
  (`validateRallyGameScore`, `validateMatchGames`, `rallyScoreHint`) — see **Match rally scoring** below
- `CourtGrid` (`@repo/ui/components/CourtGrid.svelte`) — court tile grid (court name + status); pair with `CourtDetailModal` for rosters and actions
- `CourtDetailModal` (`@repo/ui/components/CourtDetailModal.svelte`) — court detail modal (Team A/B rosters, status, optional action snippet)
- `MatchGameScoreFields` (`@repo/ui/components/MatchGameScoreFields.svelte`) — Team A vs B score entry with inline validation

## Styles

- Design tokens (`@theme`), base element styles, and shared component classes
  live in `shared/ui/styles/design-system.css`. Add shared classes there.
- Each app's `src/app.css` is thin: `@import 'tailwindcss'`, a `@source` line so
  Tailwind scans `shared/ui/**`, then `@import` of `design-system.css`.
  Only truly app-specific CSS goes in `app.css` (e.g. player's bottom-sheet).
- Use the `brand-*` color scale and `app-*` utility classes from the design
  system rather than re-defining colors.
- **Quick actions** sections (labelled “Quick actions” via `SectionHeading`) use
  `DashboardTile` links in a **3-column grid only**: wrap tiles in
  `<div class="app-quick-actions-grid">`. Do not use 1-, 2-, or 4-column grids
  for quick actions — extra tiles wrap to the next row within the same 3-column
  layout.

## Dates & times (timestamptz + device timezone)

Applies to **both apps**. Use the shared helpers in `shared/ui/datetime.ts`
(`import { ... } from '@repo/ui/datetime'`). Never hardcode a timezone like
`Asia/Bangkok` anywhere.

- **Store/transfer in UTC.** All timestamps are Postgres `timestamptz` and are
  passed around as UTC ISO strings (e.g. `2026-06-27T12:00:00.000Z`). The DB is
  the single source of truth, in UTC.
- **Display in the device timezone.** Format with `formatDateTime` /
  `formatDate` / `formatTime`, which use the runtime default timezone (the
  user's device). Don't add a `(Bangkok)`-style zone suffix.
- **Input conversion happens on the CLIENT.** `<input type="datetime-local">`
  has no timezone, so the browser reads it in the device timezone. Convert
  local → UTC on the client with `localInputToUtc` / `localInputToUtcSafe` and
  submit the UTC value via a hidden field. Never convert local → UTC on the
  server (its timezone differs from the device). Use `utcToLocalInput` to
  pre-fill a `datetime-local` from a stored UTC value.

## Conventions

- Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`).
- Package manager: **Yarn 4** (`yarn`, `yarn workspace <name> <script>`). Never npm/pnpm.
- Verify changes: `yarn check:admin` / `yarn check:player` (svelte-check),
  `yarn build:admin` / `yarn build:player` (catches Tailwind/CSS errors),
  `yarn test:admin` / `yarn test:player`.
- DB migrations: `yarn db:push` from repo root after adding/editing `supabase/migrations/*.sql`.
- Keep diffs small. Reuse before adding. Prefer deletion over duplication.

## Project rules (cross-cutting — apply everywhere)

These hold across both apps and all phases. Follow them before inventing a new pattern.

1. **Sensitive domain tables are write-via-RPC only.** App code NEVER `insert`/`update`/`delete`
   `sessions`, `session_players`, `payments`, or `session_leave_requests` directly. All state
   transitions go through `security definer` RPCs (`join_session`, `cancel_session_membership`,
   `set_session_break`, `end_session_early`, `approve_payment`, `close_session`, `confirm_cancellation_fee`, …). RLS on these tables grants
   **select only**; the RPC is the single enforcement point for every rule (capacity, timing windows,
   fees, role checks). Add the rule once in the RPC, not per caller.
2. **Realtime = subscribe then invalidate, never mutate local state.** For live data, open a browser
   Supabase channel (`createSupabaseBrowserClient().channel(...).on('postgres_changes', …)`) and on any
   event call `invalidate('app:<key>')` so the server `load` re-runs (pages declare the matching
   `depends('app:<key>')`). Don't patch `$state` from realtime payloads — let the load be the source of
   truth. There is no shared subscription helper; inline it per page with its own `depends` key.
3. **Money is `numeric` in the DB, formatted only via `@repo/ui/payments`.** Use `formatThb` to render
   and `computeCourtShare` (or the DB `compute_session_court_share`) to split. Never hardcode `฿`/`THB`
   or an inline `÷ 4` / `÷ players` anywhere.
4. **Auth before RLS in player server loads.** Call `ensureSupabaseAuth()`
   (`player-app/src/lib/server/supabaseAuth.ts`) before any RLS-gated query, or hard refresh races the
   session cookie and RLS returns empty.
5. **Time-based lifecycle = DB RPC + lazy sweep on page load.** Anything that should change "when a time
   passes" (start, cancel-if-underfilled, draft expiry) is a `security definer` RPC scheduled by
   `pg_cron` **and** invoked lazily via a `sweep*()` call on relevant admin/player loads. Never rely on
   cron alone — local dev and the free tier may not have it.
6. **RPC error strings are user-facing.** Exceptions raised in RPCs bubble up to toasts; keep them short,
   human-readable, and free of internal identifiers.

## Session join (Phase 3 — both apps, shared Supabase)

- **DB:** `supabase/migrations/0016_session_players.sql` — `session_players` table + RPCs
  (`join_session`, `cancel_session_membership`, `confirm_session_player`, `reject_session_player`,
  `leave_session`). Never insert/update `session_players` from app code directly.
- **Player:** `(player)/sessions/` list + `SessionDetailSheet`; `(player)/sessions/history/` past sessions; server helpers in
  `player-app/src/lib/server/sessions.ts`; distance sort in `player-app/src/lib/sessions/nearby.ts`
  (same pattern as `player-app/src/lib/clubs/nearby.ts`).
- **Admin:** participant lists on `(admin)/sessions/[id]/`; helpers in
  `admin-app/src/lib/server/sessionPlayers.ts`.
- **Types:** `player-app/src/lib/types/session.ts` (player-facing); `admin-app/src/lib/types/session.ts`
  (includes `SessionPlayer` types). Not in `shared/` — app-local domain types.
- **Cancellation fees (implemented, `0027`):** late cancel records `fee_owed = cancellation_fee` and
  `fee_status = 'owed'`. Player pays via PromptPay QR (`CancellationFeeModal`) → `submit_cancellation_fee`
  (`fee_status = 'submitted'`); admin confirms/waives via `SessionCancellationFees` →
  `confirm_cancellation_fee` / `waive_cancellation_fee`. Join is blocked while any
  `fee_owed > 0 and fee_status in ('owed','submitted')`.
- **Cancel lock (`0029`):** waiting players cannot self-cancel within **15 min** of `start_at` — RPC raises
  a user-facing error; queued players still cancel free anytime. Admin can still reject waiting players.

## Session lifecycle (Phase 3 — DB + lazy sweep)

- **DB:** `0021_session_in_progress.sql` — `start_due_sessions()` RPC; pg_cron every minute when
  extension available; `join_session` allows join on `open` or `in_progress` until **30 min before
  `end_at`** (`player-app/src/lib/config/session.ts` → `SESSION_JOIN_CLOSE_LEAD_MINUTES`).
- **DB:** `0022_session_min_players_lifecycle.sql` — extends `start_due_sessions()`:
  - T−15 min → `start_at`: `(waiting + confirmed) < min_players` → `cancelled` + release players
  - At `start_at`: `confirmed < min_players` → `cancelled`; else `open` → `in_progress`
- **Lazy sweep:** both apps call `sweepStartedSessions()` → RPC on admin/player page loads
  (`admin-app/src/lib/server/sessions.ts`, `player-app/src/lib/server/sessions.ts`, `clubDetail.ts`).
  Local dev without pg_cron relies on this.
- **Draft:** status `draft` → admin must open before start−1 hr (`0017_session_draft.sql`);
  `sweepOverdueDraftSessions()` on admin load.
- **Cancel audit (`0028`):** cancelling sets `cancel_source` (`club_admin`|`super_admin`|`system`),
  `cancel_reason`, `cancelled_by`. System reasons (min-players sweeps, overdue draft) are set in the
  RPC/sweep; admin cancel currently writes a fixed role-based string (no free-text reason field yet).
  `finished_at` (`0026`) records the real close/cancel time, distinct from scheduled `end_at`.
- **End early (`0031`):** admin `end_session_early` during `in_progress` sets `ended_early`, bills all
  confirmed players immediately. `close_session` gate is `now() >= end_at OR ended_early` (plus all
  payments approved and fees resolved).

## Live session, payments & settlement (Phase 7 — implemented)

The `/live` (player) and `/control` (admin) pages are **real**, not placeholders. Match/court control
inside them is still Phase 4 (`CourtGrid` shows idle courts; "match control arrives later").

- **DB:** `0023_session_live_realtime.sql` (Realtime publication on `sessions` + `session_players`),
  `0024_session_payments_leave.sql` (`payments` + `session_leave_requests` tables; RPCs
  `request_session_leave`, `cancel_session_leave`, `submit_payment`, `approve_payment`,
  `begin_session_settlement`, `approve_session_leave`, `reject_session_leave`, `close_session`,
  `end_session_early`; `compute_session_court_share`), `0025_session_promptpay.sql` (session-level `promptpay_type` /
  `promptpay_target` snapshot, required on create/edit), `0030_session_player_activity.sql` (`activity` /
  `idle_since` on `session_players`; `set_session_break`), `0031_session_end_early.sql` (`ended_early`).
- **Player live (`(player)/sessions/[id]/live/`):** `loadLiveSessionForPlayer` +
  `requestSessionLeave` / `cancelSessionLeave` / `submitPayment` / `setSessionBreak` in
  `player-app/src/lib/server/sessions.ts`; UI state machine in `player-app/src/lib/sessions/liveState.ts`;
  activity labels/badges + idle timer via `@repo/ui/sessionStatus` (`clampIdleSince` so pre-start idle
  never shows negative uptime); PromptPay QR via `PaymentQr.svelte`; payment modal auto-opens when the bill is `pending`/`submitted`.
- **Admin control (`(admin)/sessions/[id]/control/`):** helpers in
  `admin-app/src/lib/server/sessionControl.ts` (`loadSessionPayments`, `loadSessionLeaveRequests`,
  approve payment/leave, settlement, `endSessionEarly`, close). Flow: `begin_session_settlement` or
  `end_session_early` → per-player `approve_payment` → `close_session` (after `end_at` **or** `ended_early`,
  all confirmed players have an `approved` payment, and all cancellation fees resolved). Leave requests need an approved payment before
  `approve_session_leave`.
- **Activity mirror (`0030`):** `session_players.activity` (`idle|playing|break|billing`) is a
  roster-visible mirror of billing/leave state; `payments` stays the source of truth for money.
  `request_session_leave` / `begin_session_settlement` set `billing`; `cancel_session_leave` resets to
  `idle`. `playing` is reserved for Phase 4 match data.
- **Court share only today:** `compute_session_court_share` =
  `court_fee_per_hour × hours × court_count ÷ active_players` (`confirmed` + `left`). Shuttle share is
  schema-ready but UI says "appears when matches are recorded" (Phase 4).
- **Roster RLS:** `0019`/`0020` — members see roster via `is_active_session_member()` security
  definer; player loads must call `ensureSupabaseAuth()` before RLS queries
  (`player-app/src/lib/server/supabaseAuth.ts`).
- **Transactions:** unified payment history (session court bills + cancellation fees) — player
  `PlayerTransactionsPanel` (profile), admin `(admin)/transactions/`; helpers in each app's
  `src/lib/server/transactions.ts` + `@repo/ui/transactions`.
- **Session history:** admin `(admin)/sessions/history/` + `SessionHistoryDetail`; player
  `(player)/sessions/history/` with filters (status, club, date) — parallel pattern, app-local helpers.

## Super admin home (`admin-app` `/`)

- Club list: searchable/filterable rows (not tile grid); uses `app-filter-row` like Users page.
- Quick actions: Create club, Users, Sessions, Payment transactions — always
  `app-quick-actions-grid` (3 columns).
- Dual-role super admin (also in `club_admins`): workspace switch **Super** ↔ **Club** via
  `AdminWorkspaceSwitch` + cookie `admin_dashboard_mode`; effective role becomes `club_admin` in
  club mode (`admin-app/src/lib/adminWorkspace.ts`, `adminDashboardMode.ts`).

## Match rally scoring (Phase 4 — enforced in DB + `@repo/ui/matches`)

Sessions snapshot `match_score_type` (`15` or `21`) onto each `matches.score_type`. Every game
score submitted via RPC (`end_match_with_score`, `submit_match_score`, `resolve_match_score`) is
validated by `validate_rally_game_score` / `validate_match_games` in Postgres and mirrored in
`@repo/ui/matches` for client-side UX before submit.

**Normal win:** one team reaches the target (`21` or `15`) and the other is **below** the deuce line
(`score_type − 1`). Examples for 21-point games: `21-18`, `10-21`. Invalid: `21-20` (deuce continues).

**Deuce (overtime):** at `20-20` (21-point) or `14-14` (15-point), play until one team leads by **2**.
Valid examples: `22-20`, `24-22`, `23-25`, `16-14` (15-point). Invalid: `22-21` (only 1-point lead).

Use `MatchGameScoreFields` + `validateMatchGames` in UI; never invent ad-hoc score rules in app code.
