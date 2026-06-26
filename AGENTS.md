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
- Single-app components: `MapPinPicker` (admin); `ClubDetailSheet`,
  `DisplayNameField`, `PwaHead`, `PwaPrompts` (player).

## Styles

- Design tokens (`@theme`), base element styles, and shared component classes
  live in `shared/ui/styles/design-system.css`. Add shared classes there.
- Each app's `src/app.css` is thin: `@import 'tailwindcss'`, a `@source` line so
  Tailwind scans `shared/ui/**`, then `@import` of `design-system.css`.
  Only truly app-specific CSS goes in `app.css` (e.g. player's bottom-sheet).
- Use the `brand-*` color scale and `app-*` utility classes from the design
  system rather than re-defining colors.

## Conventions

- Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`).
- Package manager: **Yarn 4** (`yarn`, `yarn workspace <name> <script>`). Never npm/pnpm.
- Verify changes: `yarn check:admin` / `yarn check:player` (svelte-check),
  `yarn build:admin` / `yarn build:player` (catches Tailwind/CSS errors),
  `yarn test:admin` / `yarn test:player`.
- Keep diffs small. Reuse before adding. Prefer deletion over duplication.
