# Mal3abi.Client

Website (and later the mobile app) for Mal3abi, a court booking platform for Jordan (football and padel to start). Three roles: player, court owner, super admin.

This repo was rebuilt from scratch on branch `KAN-5-project-setup`. The old Vite/Figma frontend is in git history on `main`; do not bring any of it back.

## Structure

- `apps/web`: Next.js (App Router) + TypeScript strict + Tailwind CSS v4 + shadcn/ui.
- `packages/shared`: shared across web and mobile: theme tokens (`src/tokens/theme.css`), locales and messages (`src/i18n`), and later the generated API client and types.
- `apps/mobile`: React Native + Expo, later.

## Commands (run from the repo root)

- `pnpm install`
- `pnpm dev`: web app on http://localhost:3000 (redirects to `/ar`). On Windows PowerShell use `pnpm.cmd`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format`
- Env: copy `apps/web/.env.example` to `apps/web/.env.local`. No secrets in the code or in `NEXT_PUBLIC_` variables.

CI (`.github/workflows/ci.yml`) runs format check, typecheck, lint, test and build on every pull request.

## Fixed rules

- **Languages:** Arabic (default, `dir="rtl"`) and English (`dir="ltr"`), with next-intl. Routes are `/ar/...` and `/en/...`; `/` goes to the saved choice (`NEXT_LOCALE` cookie) or Arabic, never the browser language (`src/proxy.ts`).
  - No UI text in components: every string lives in `packages/shared/src/i18n/messages/{ar,en}.json` (same keys in both, tested). Read it with `useTranslations` / `getTranslations`; keys are type-checked. ESLint blocks raw JSX text and raw `aria-label`/`title`/`alt`/`placeholder`.
  - Use `Link`, `useRouter`, `usePathname`, `redirect` from `@/i18n/navigation`, not from `next/link` or `next/navigation`.
  - Every page calls `setRequestLocale(locale)` and sets `alternates: localeAlternates(locale, path)` (`@/i18n/seo`) for canonical and hreflang links.
  - Numbers, prices (JOD), dates and times: `useFormat()` from `@/i18n/format` (shared helpers in `packages/shared/src/i18n/format.ts`). Western digits in both languages, Amman time zone. Never `toLocaleString` or raw `Intl`.
  - Database content in two languages (court names, sports, cities, areas): `localized(text, locale)` from `@mal3abi/shared/i18n`, which falls back to the other language.
  - Internal review page: `/ar/dev/i18n` (development only).
- **Logical CSS only:** `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`. Never left/right (ESLint blocks it). Icons that point a direction use `DirectionalIcon` (`@/components/directional-icon`), which mirrors them in Arabic.
- Modern Standard Arabic copy. **No emojis anywhere.**
- **Fonts:** IBM Plex Sans Arabic and IBM Plex Sans, through `next/font`.
- **Theme:** light = "green", dark = "dark". Colors come only from the tokens in `packages/shared/src/tokens/theme.css` (Tailwind: `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-accent-ink`, `bg-accent-soft`, `text-accent-2`). Never write a hex color in a component. The accent is for buttons and primary actions only.
- **Tokens:** the single source is `packages/shared/src/tokens/tokens.ts` (also for the mobile app). After changing a value run `pnpm --filter @mal3abi/shared gen:tokens` to regenerate `theme.css`; a test fails if it is out of date, and another checks 4.5:1 text contrast in both modes. Extra colors beyond the brief: `warning-soft`, `danger`, `danger-soft`.
- **Theme toggle:** `ThemeToggle` (`@/components/theme-toggle`). The script in the layout `<head>` (`@/lib/theme`) sets `data-theme` before paint from the saved choice or the system setting, so there is no flash. Use the `dark:` variant only when a token cannot express it.
- **Components:** use the ones in `apps/web/src/components/ui` (button, input/field, select, checkbox, tabs, dialog, alert, card, status-badge, table, calendar, time-picker, image-upload, states) instead of new one-off styles. Review page: `/ar/dev/components` (development only).
- **Numbers in messages:** pass numbers to `t()` as strings (`String(n)`), because ICU number arguments would print Arabic-Indic digits.
- **Shape:** 10px radius on buttons and inputs (`rounded-control`), 14-16px on cards (`rounded-card`), 1px borders, no shadows or gradients, controls at least 44px tall (`h-control`).
- **Data:** every backend call goes through the client generated from the Mal3abi.BE OpenAPI contract (TanStack Query). No hand-written fetch calls. MSW mock data until the contract exists.
- **Sessions:** HttpOnly cookie from the backend; the website stores no tokens. Send the CSRF token on every request that changes data.
- **Forms:** react-hook-form + zod. UI validation is always also enforced on the server.
- **Sports are never hard-coded:** they come from the admin-managed list in the database.
- **Maps:** Google Maps, loaded only when the user taps "Show map".
- Every screen has loading, empty and error states, in both languages and both modes, and works on phone and desktop.

## References

- `../docs/ui-brief.md` (stack, tokens, Jira), `../docs/reference.html` (full product reference, Arabic).
- Design preview: https://claude.ai/artifact/PFNJR9st8gN9erhoFHEJX8
- Jira: https://mal3abi.atlassian.net, project KAN, epic KAN-4. Put the task key in branch names (for example `KAN-6-design-system`).
- Do not commit or push unless asked. When a Jira task is finished, assign it to the user and move it to Done.
