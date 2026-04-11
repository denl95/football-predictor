@AGENTS.md

# Football Predictor

A Next.js app for predicting football match scores, with a leaderboard and per-user prediction history.

## Tech Stack

| Tool | Version | Notes |
|------|---------|-------|
| Next.js | 16.2.3 | See AGENTS.md — read the docs before writing any Next.js code |
| React | 19.2.4 | |
| Prisma | 7.7.0 | Uses driver adapter, NOT the standard `@prisma/client` import |
| NextAuth | v5 beta | `next-auth@^5.0.0-beta.30` — APIs differ from v4 |
| Tailwind CSS | v4 | CSS-first config via `@theme inline` in `globals.css` |
| Biome | 2.x | Replaces ESLint + Prettier |
| Zod | v4 | APIs differ from v3 |
| Package manager | Bun | Use `bun` for all installs and scripts |
| Database | PostgreSQL | |

## Commands

```bash
bun dev          # start dev server
bun build        # production build
bun lint         # biome check
bun lint:fix     # biome check --write
bun format       # biome format --write
bun db:migrate   # prisma migrate dev
bun db:seed      # run prisma/seed.ts
bun db:studio    # open Prisma Studio
```

## Project Structure

```
src/
  app/
    (app)/               # Protected route group — all pages require auth
      layout.tsx         # Wraps pages with <Navbar> and max-w-6xl container
      matches/
        page.tsx         # Match list grouped by stage/group
        [id]/page.tsx    # Single match detail + prediction form
      my-predictions/page.tsx
      leaderboard/page.tsx
    login/page.tsx       # Public login page (Google OAuth)
    api/auth/[...nextauth]/route.ts
    layout.tsx           # Root layout (fonts, globals.css)
    page.tsx             # Root — redirects authenticated users to /matches
  actions/
    predictions.ts       # Server actions: upsertPrediction, finaliseMatch
  lib/
    auth.ts              # NextAuth config (Google provider, Prisma adapter)
    db.ts                # Prisma client singleton (PrismaPg driver adapter)
    points.ts            # calculatePoints() — scoring logic
  components/
    Navbar.tsx
    PredictionForm.tsx
  generated/prisma/      # Auto-generated — never edit manually
  middleware.ts          # Auth guard for all routes except login/root/api/auth
```

## Database

Models in `prisma/schema.prisma`:
- **Auth.js required**: `User`, `Account`, `Session`, `VerificationToken`
- **App**: `Match` (with `MatchStatus` and `MatchStage` enums), `Prediction`

Prisma client is generated to `src/generated/prisma/` — import from there:
```ts
import { PrismaClient } from "@/generated/prisma/client";
```
Never import from `@prisma/client` directly.

The db singleton in `src/lib/db.ts` uses `PrismaPg` (driver adapter pattern via `@prisma/adapter-pg`). Always import `prisma` from `@/lib/db`.

## Auth

- Google OAuth only via NextAuth v5
- Middleware protects everything except: `api/auth/**`, `_next/**`, `favicon.ico`, `/login`, `/` (root)
- Admin actions (e.g. `finaliseMatch`) check `session.user.email === process.env.ADMIN_EMAIL`
- `session.user.id` is available because the session callback in `src/lib/auth.ts` attaches it

Required environment variables:
```
DATABASE_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
ADMIN_EMAIL=
```

## Points System

Defined in `src/lib/points.ts`:
- **3 pts** — exact score
- **2 pts** — correct goal difference (implies correct winner / draw)
- **1 pt** — correct winner or draw
- **0 pts** — wrong

Points are calculated and written to `Prediction.points` when `finaliseMatch` is called.

## Styling Conventions

Tailwind v4 with a custom dark theme. Design tokens are CSS variables defined in `globals.css` and exposed as Tailwind colors via `@theme inline`:

| Token | Color |
|-------|-------|
| `background` | `#07090f` (near-black) |
| `surface` | `#111827` |
| `surface-2` | `#1f2937` |
| `border` | `#374151` |
| `foreground` | `#f9fafb` |
| `foreground-muted` | `#9ca3af` |
| `accent` | `#10b981` (green) |
| `gold` | `#f59e0b` |

Use these tokens (`bg-surface`, `text-accent`, `border-border`, etc.) — do not hardcode hex values.

## Code Style (enforced by Biome)

- **Indentation**: tabs
- **Quotes**: double quotes for JS/TS strings
- **Modules**: ESM only — no CommonJS (`require`/`module.exports`)
- **Variables**: `const` preferred, no `var`
- **Types**: no `any` (use `biome-ignore` with a comment if truly unavoidable)
- Biome auto-organizes imports on save (`assist.actions.source.organizeImports: "on"`)

## Server Actions

All server actions live in `src/actions/`. They use `"use server"` and follow the pattern:
- Validate session first, return `{ success: false, error: "Unauthorised" }` if missing
- Parse input with Zod, return `{ success: false, error: "..." }` on failure
- Call `revalidatePath` for affected routes after mutations
- Use `PredictionState = { success: true } | { success: false; error: string }` as the return type for form actions
