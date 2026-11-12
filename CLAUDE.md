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
- `pnpm gen:api`: regenerate the API client from the OpenAPI contract
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
- **Site frame:** public and account pages live in `apps/web/src/app/[locale]/(site)/`, whose layout adds the header (logo, links, quick search, dashboard link by role, language and theme toggles, account menu; a side menu below 1024px) and the footer. Internal `/dev/*` pages sit outside it. Shell parts are in `apps/web/src/components/shell`.
- **Protected pages:** wrap them in a `layout.tsx` with `<RequireRole roles={[...]}>` (no roles: any signed-in user; admins pass every check). Signed out goes to sign-in and back; the wrong role sees "not authorized". The backend checks every request again.
- **Error pages:** unknown addresses hit `(site)/[...rest]` and show `(site)/not-found.tsx`; render crashes show `(site)/error.tsx`; `app/global-error.tsx` is the bilingual last resort. Pages that later tasks build use `placeholderPage()` until then, so every link works.
- **Shape:** 10px radius on buttons and inputs (`rounded-control`), 14-16px on cards (`rounded-card`), 1px borders, no shadows or gradients, controls at least 44px tall (`h-control`).
- **Data:** every backend call goes through the client generated from the OpenAPI contract: TanStack Query hooks from `@mal3abi/shared/api` (for example `useSearchCourts`, `useCreateBooking`). ESLint blocks `fetch` and axios in app code.
  - Contract: `packages/shared/openapi/mal3abi.yaml`. It is a **temporary** contract written from the product reference until Mal3abi.BE publishes its own; then replace the file with the backend's swagger.json. After any change run `pnpm gen:api` (orval) and commit `packages/shared/src/api/generated`. CI fails if it is out of date; never edit generated files.
  - All requests pass through `packages/shared/src/api/fetcher.ts` (`apiFetch`). The web app configures it in `apps/web/src/lib/api.ts`.
  - The browser calls `/api/...` on this site; `next.config.ts` proxies it to `API_BASE_URL` (Mal3abi.BE), so the session cookie stays first-party.
  - Mock data: `NEXT_PUBLIC_API_MOCKING=enabled` answers requests in the browser from `packages/shared/src/api/mocks` (MSW handlers, no service worker). The data is typed with the generated types, so contract changes break the build there too. Switch the mock account at `/ar/dev/sign-in`; review page `/ar/dev/api`.
- **Sessions:** HttpOnly cookie from the backend; the website stores no tokens. `useSession()`, `useSignIn()`, `useSignOut()`, `hasRole()` from `@/lib/session`. The CSRF token (cookie `XSRF-TOKEN`, or `GET /api/auth/csrf`) is sent as `X-CSRF-TOKEN` on every request that changes data, and refreshed once on `csrf_invalid`.
- **Errors:** the API throws `ApiError` with a stable `code`. 401 (except `/api/auth/me`) sends the user to sign-in and back; `email_not_verified` goes to `/[locale]/verify-email`; everything else shows `useErrorMessage()(error)` from `@/lib/api-errors` in the user's language. Never show the backend's English text.
- **Forms:** react-hook-form + zod. UI validation is always also enforced on the server.
- **Sports are never hard-coded:** they come from the admin-managed list in the database.
- **Maps:** Google Maps, loaded only when the user taps "Show map".
- Every screen has loading, empty and error states, in both languages and both modes, and works on phone and desktop.

## References

- `../docs/ui-brief.md` (stack, tokens, Jira), `../docs/reference.html` (full product reference, Arabic).
- Design preview: https://claude.ai/artifact/PFNJR9st8gN9erhoFHEJX8
- Jira: https://mal3abi.atlassian.net, project KAN, epic KAN-4. Put the task key in branch names (for example `KAN-6-design-system`).
- Do not commit or push unless asked. When a Jira task is finished, assign it to the user and move it to Done.
