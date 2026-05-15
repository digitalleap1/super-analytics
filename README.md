# SEO Reporting Dashboard

A multi-tenant SEO reporting dashboard for agencies. Connect each client project to **Google Search Console** and **Google Analytics 4**, track keyword rankings, and view unified reports with date-range filters.

Built with Next.js 14 (App Router), Prisma, NextAuth v5, Tailwind + shadcn/ui, Recharts, and TanStack Table.

## Quick start

```bash
pnpm install         # installs deps + runs prisma generate
pnpm db:push         # creates the SQLite database from the schema
pnpm db:seed         # creates a demo user + sample project + keywords
pnpm dev             # starts the dev server at http://localhost:3000
```

Sign in with the seeded credentials:
- **Email:** `demo@seo-dashboard.local`
- **Password:** `demo1234`

Or hit `/register` to create a fresh account.

## Stack

| | |
|---|---|
| Framework | Next.js 14.2 App Router + TypeScript |
| Styling | Tailwind v3 + shadcn/ui (CSS variables, dark-mode-ready) |
| Auth | NextAuth v5 (Auth.js) — credentials + Google OAuth |
| Database | Prisma 6 on SQLite for dev; switch `provider`/`DATABASE_URL` for Postgres |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| Google APIs | `googleapis` (Search Console + GA4 Data API) |
| Env validation | `@t3-oss/env-nextjs` |

## How it works

### Without Google credentials (stub mode)
If `GOOGLE_CLIENT_ID` is missing — or a project hasn't been connected to a GSC site / GA4 property yet — the report and keyword views fall back to **deterministic sample data**. Charts and tables look realistic, change with date ranges, and persist across reloads (same seed -> same numbers), so the entire UI is testable without real OAuth set up.

A yellow banner on the project page tells you when you're seeing sample data.

### With Google credentials (live mode)
Once `.env` has real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and a user has signed in with Google, each project can be wired to a real Search Console property and a GA4 property. From then on, all report data is fetched live from Google and cached for 6 hours in the `ReportCache` table.

The integration is designed so the same `lib/google/{gsc,ga4}.ts` wrappers handle both paths — they try the live call and fall back to stub on any error.

## Environment variables

Create `.env` (copy from `.env.example`):

```dotenv
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""               # generate: openssl rand -base64 32
GOOGLE_CLIENT_ID=""              # optional — leave blank for stub mode
GOOGLE_CLIENT_SECRET=""          # optional
CRON_SECRET=""                   # generate: openssl rand -hex 32
```

## Setting up Google OAuth (for live data)

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **Enable APIs:**
   - Search Console API
   - Google Analytics Data API
   - Google Analytics Admin API (only needed for listing GA4 properties)
3. **OAuth consent screen** — User type: External. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/webmasters.readonly`
   - `.../auth/analytics.readonly`
4. **Credentials** -> Create OAuth client -> **Web application**.
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** into `.env`.
6. Restart the dev server.

## Project structure

```
app/
  (auth)/                    Public pages: /login, /register
  (app)/                     Authed shell with sidebar + topbar
    dashboard/               Projects overview
    projects/
      new/                   4-step new-project wizard
      [id]/                  Project report page
        keywords/            Keyword tracking
        settings/            Edit + delete project
  api/
    auth/                    NextAuth handlers + register endpoint
    projects/                Project CRUD + per-project GSC/GA4 endpoints
    integrations/google/     GSC sites + GA4 properties listers
    cron/refresh-keywords/   Nightly ranking pull
components/
  ui/                        shadcn primitives (button, dialog, dropdown, etc.)
  layout/                    Sidebar, topbar, user menu
  auth/                      Login + register forms
  projects/                  Cards, wizard, settings forms
  reports/                   KPI cards, date picker, tables, CSV export
  charts/                    Recharts wrappers
  keywords/                  Keyword table, add modal, history chart
lib/
  auth.ts / auth.config.ts   NextAuth v5 split config (Edge-safe middleware)
  prisma.ts                  PrismaClient singleton
  google/                    Token refresh, GSC + GA4 wrappers, stub generator
  cache.ts                   ReportCache 6-hour TTL helpers
  date-ranges.ts             Preset ranges + previous-period math
  validators.ts              Zod schemas for project + keyword input
prisma/
  schema.prisma              Models: User, Account, Session, Project, Keyword, KeywordRanking, ReportCache
  seed.ts                    Demo data
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run a production build |
| `pnpm lint` | ESLint over the codebase |
| `pnpm db:push` | Apply the Prisma schema to the database |
| `pnpm db:migrate` | Create + apply a Prisma migration |
| `pnpm db:studio` | Open Prisma Studio (GUI) |
| `pnpm db:seed` | Insert demo user + sample project |

## Switching to Postgres

1. Change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` to your Postgres connection string in `.env`.
3. Run `pnpm prisma migrate dev --name init`.

Long text columns (refresh tokens, JSON-ish payloads) are plain `String` in the schema — Postgres maps these to `text` which is unlimited, so no schema annotations need to change.

## Running the keyword refresh cron

The `/api/cron/refresh-keywords` endpoint pulls yesterday's GSC data for every tracked keyword and upserts into `KeywordRanking`. It's protected by `CRON_SECRET`.

**Manual:**
```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/refresh-keywords
```

**Vercel Cron** (add to `vercel.json`):
```json
{
  "crons": [
    { "path": "/api/cron/refresh-keywords", "schedule": "0 3 * * *" }
  ]
}
```
Vercel injects the secret via the `Authorization: Bearer` header — set `CRON_SECRET` as a Vercel project env var.

**Self-host** with node-cron, GitHub Actions, or any other scheduler — the endpoint only checks the secret header.

## Screenshots

> Add screenshots of: `/dashboard`, `/projects/[id]`, `/projects/[id]/keywords`, and the new-project wizard. Place them in `docs/screenshots/` and reference them here.

## Build phases reference

This project was built in 7 phases:

1. **Scaffolding** — Next.js + Tailwind + Prisma + shadcn config
2. **Auth** — NextAuth v5 credentials + Google + app shell
3. **Projects CRUD** — dashboard, new-project wizard, project page, settings
4. **Google integration** — token refresh, GSC + GA4 client wrappers (with stub fallback)
5. **Reports** — KPI cards, charts, sortable tables, CSV export, ReportCache TTL
6. **Keyword tracking** — keyword page, add modal, history chart, cron route
7. **Polish** — error boundaries, 404, seed script, this README

See `git log` for the per-phase commits.
