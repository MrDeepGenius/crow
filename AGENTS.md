# Base44 Dev Environment

## Stack
- Next.js 16.3.4 (app router, Turbopack) + React 19 + TypeScript
- next-intl for i18n (locales: en, es, pt, ru, it, zh)
- Tailwind CSS v4 (via @tailwindcss/postcss)
- Local SQLite database at `./data/crow.db` (path overridable via `DATABASE_PATH`)
- No external services required to boot — all env vars have code-level defaults

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
The `web` service bind-mounts the repo at `/app`, installs deps on start, and runs
`next dev -H 0.0.0.0 -p 3000`. `node_modules` is a named volume so host installs don't clobber it.
Live reload works (WATCHPACK_POLLING=true for bind-mount reliability).

## Quirks / non-obvious findings
- **Two next.config files exist.** Next.js 16 loads `next.config.js` (the one with the
  next-intl plugin), NOT `next.config.ts`. Both were given `allowedDevOrigins` for the
  preview origin.
- **next-intl plugin path.** `createNextIntlPlugin()` was called with no argument, but the
  request config lives at `./i18n.ts` (not the default `./i18n/request.ts`). Fixed by passing
  `createNextIntlPlugin('./i18n.ts')` — without this the dev server fails to load the config.
- **Incomplete i18n migration.** Pages live at the app root (`app/page.tsx`,
  `app/create/page.tsx`, …) and are self-contained client components with hardcoded Spanish
  text — they do NOT use `useTranslations`. The `app/[locale]/layout.tsx` + `middleware.ts`
  i18n layer has no pages under it, so the middleware's `localePrefix: 'always'` redirected
  `/` → `/en` → 404. To make the app render, the middleware matcher was set to `[]` (disabled)
  and the root `app/layout.tsx` was given proper `<html>`/`<body>` tags (Next.js requires them
  in the root layout; the original returned bare `children`).
- `app/[locale]/layout.tsx` still contains its own `<html>`/`<body>` (dead code, unreachable
  while middleware is disabled). It is not compiled unless a `/en`-style route is visited.

## Optional env vars (not required to boot)
- `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_TEMPERATURE` / `OPENAI_MAX_TOKENS` — AI generation
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` / … — alternate AI provider
- `CROW_ADMIN_EMAILS`, `CROW_ADMIN_KEY` — admin auth
- `CROW_PAYMENT_WALLET` / `CROW_TREASURY_BEP20`, `USDT_BSC_CONTRACT`, `MIN_CONFIRMATIONS`, etc. — crypto payment config
- `DATABASE_PATH` — SQLite file location (default `./data/crow.db`)

## Verifying it works
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
- Home page shows the "Crow Market" hero + "Crow Create Studio" chat mockup
- `npm test` runs the vitest suite (tests set their own `DATABASE_PATH` to temp files)
