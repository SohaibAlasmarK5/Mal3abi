# Mal3abi.Client

Website (and later the mobile app) for Mal3abi, a court booking platform for Jordan (football and padel to start). Three roles: player, court owner, super admin.

This repo was rebuilt from scratch on branch `KAN-5-project-setup`. The old Vite/Figma frontend is in git history on `main`; do not bring any of it back.

## Structure

- `apps/web`: Next.js (App Router) + TypeScript strict + Tailwind CSS v4 + shadcn/ui.
- `packages/shared`: shared across web and mobile: theme tokens (`src/tokens/theme.css`), locales and messages (`src/i18n`), and later the generated API client and types.
- `apps/mobile`: React Native + Expo, later.

## Commands (run from the repo root)

- `pnpm install`
- `pnpm dev`: web app on http://localhost:3000 (redirects to `/ar`)
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format`
- Env: copy `apps/web/.env.example` to `apps/web/.env.local`. No secrets in the code or in `NEXT_PUBLIC_` variables.

CI (`.github/workflows/ci.yml`) runs format check, typecheck, lint, test and build on every pull request.

## Fixed rules

- **Languages:** Arabic (default, `dir="rtl"`) and English (`dir="ltr"`), with a toggle. Routes are `/ar/...` and `/en/...`. No UI text is hard-coded in components: every string lives in `packages/shared/src/i18n/messages/{ar,en}.json`, with the same keys in both.
- **Logical CSS only:** `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`. Never left/right (ESLint blocks it). Direction icons flip with the language.
- Modern Standard Arabic copy. **No emojis anywhere.**
- **Fonts:** IBM Plex Sans Arabic and IBM Plex Sans, through `next/font`.
- **Theme:** light = "green", dark = "dark". Colors come only from the tokens in `packages/shared/src/tokens/theme.css` (Tailwind: `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-accent-ink`, `bg-accent-soft`, `text-accent-2`). Never write a hex color in a component. The accent is for buttons and primary actions only.
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
- Do not commit or push unless asked.
