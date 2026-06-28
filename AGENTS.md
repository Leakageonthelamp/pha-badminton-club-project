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
- Single-app components: `MapPinPicker`, `UpcomingSessionsPanel`, `SessionListLink`, `SessionForm` (admin);
  `ClubDetailSheet`, `SessionDetailSheet`, `DisplayNameField`, `PwaHead`, `PwaPrompts` (player).

### Shared UI modules (non-component)

- `@repo/ui/datetime` — UTC storage, device-timezone display/input conversion
- `@repo/ui/richText` — `richTextPlainText`, `richTextExcerpt`, `isRichTextEmpty` (list cards + empty checks)
- `@repo/ui/geolocation` — stored user location helpers (player distance sort)

## Styles

- Design tokens (`@theme`), base element styles, and shared component classes
  live in `shared/ui/styles/design-system.css`. Add shared classes there.
- Each app's `src/app.css` is thin: `@import 'tailwindcss'`, a `@source` line so
  Tailwind scans `shared/ui/**`, then `@import` of `design-system.css`.
  Only truly app-specific CSS goes in `app.css` (e.g. player's bottom-sheet).
- Use the `brand-*` color scale and `app-*` utility classes from the design
  system rather than re-defining colors.

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

## Session join (Phase 3 — both apps, shared Supabase)

- **DB:** `supabase/migrations/0016_session_players.sql` — `session_players` table + RPCs
  (`join_session`, `cancel_session_membership`, `confirm_session_player`, `reject_session_player`,
  `leave_session`). Never insert/update `session_players` from app code directly.
- **Player:** `(player)/sessions/` list + `SessionDetailSheet`; server helpers in
  `player-app/src/lib/server/sessions.ts`; distance sort in `player-app/src/lib/sessions/nearby.ts`
  (same pattern as `player-app/src/lib/clubs/nearby.ts`).
- **Admin:** participant lists on `(admin)/sessions/[id]/`; helpers in
  `admin-app/src/lib/server/sessionPlayers.ts`.
- **Types:** `player-app/src/lib/types/session.ts` (player-facing); `admin-app/src/lib/types/session.ts`
  (includes `SessionPlayer` types). Not in `shared/` — app-local domain types.
- **Fees:** `cancellation_fee` on session is recorded as `fee_owed` on late cancel; collection is
  Phase 7 (PromptPay), not implemented yet.

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

## Session in_progress UI (Phase 3 shell — match flow Phase 4)

- **Player:** joined + `in_progress` → navigate to `/sessions/[id]/live` (placeholder) via
  `shouldOpenLiveSession` / `liveSessionHref` in `player-app/src/lib/sessions/navigation.ts`.
  Used on home, sessions list, `ClubDetailSheet`, `SessionDetailSheet` back nav.
- **Admin:** dashboard splits **Ongoing** vs **Upcoming** (`filterOngoingSessions` in
  `admin-app/src/lib/sessions/list.ts`); session detail shows **Session control** when
  `in_progress` → `/sessions/[id]/control` (placeholder).
- **Roster RLS:** `0019`/`0020` — members see roster via `is_active_session_member()` security
  definer; player loads must call `ensureSupabaseAuth()` before RLS queries
  (`player-app/src/lib/server/supabaseAuth.ts`).

## Super admin home (`admin-app` `/`)

- Club list: searchable/filterable rows (not tile grid); uses `app-filter-row` like Users page.
- Quick actions: Create club, Users, Sessions.
- Dual-role super admin (also in `club_admins`): workspace switch **Super** ↔ **Club** via
  `AdminWorkspaceSwitch` + cookie `admin_dashboard_mode`; effective role becomes `club_admin` in
  club mode (`admin-app/src/lib/adminWorkspace.ts`, `adminDashboardMode.ts`).
