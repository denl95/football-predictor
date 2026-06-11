@AGENTS.md

# Football Predictor

A Next.js app for predicting World Cup 2026 results: match-score predictions, a
knockout-bracket predictor, private leagues with leaderboards, and per-user history.

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
      groups/page.tsx    # Group-stage standings tables
      bracket/page.tsx   # Knockout bracket predictions (<BracketTree>)
      leagues/
        page.tsx         # The user's leagues
        new/page.tsx     # Create a league
        [slug]/page.tsx  # League leaderboard + creator controls (rename/remove)
        join/[slug]/page.tsx  # Join via shared link
      players/[id]/page.tsx   # Head-to-head: your predictions vs another player
      teams/[name]/page.tsx   # All matches for one team
      my-predictions/page.tsx
      admin/page.tsx     # Admin only (ADMIN_EMAIL) — list + delete users
    login/page.tsx       # Public login — Google OAuth + email/password
    api/auth/[...nextauth]/route.ts
    api/cron/sync/route.ts   # Daily score sync (Vercel Cron, CRON_SECRET-guarded)
    layout.tsx           # Root layout (fonts, globals.css)
    page.tsx             # Root — redirects authenticated users to /matches
  actions/
    predictions.ts       # upsertPrediction, finaliseMatch
    bracket.ts           # saveBracketPicks, finaliseBracketMatch
    leagues.ts           # createLeagueAction, joinLeague, renameLeague, removeMember
    admin.ts             # deleteUser (ADMIN_EMAIL only)
    auth.ts              # registerUser (email/password signup, bcrypt)
  lib/
    auth.ts              # NextAuth config (Google + Credentials, JWT strategy)
    db.ts                # Prisma client singleton (PrismaPg driver adapter)
    points.ts            # calculatePoints() — match scoring
    bracket.ts           # STAGE_POINTS, GROUPS, teamsForLabel() — bracket scoring/labels
    prediction-status.ts # 48h prediction window: navbar badge + league ready/pending
    football-data.ts     # football-data.org API client (used by cron sync)
  components/            # Navbar, NavLinks, BracketTree, LeaderboardChart,
                         # PredictionForm, Flag, CopyButton, DeleteUserButton,
                         # RenameLeagueForm, RemoveMemberButton, NavigationProgress
  generated/prisma/      # Auto-generated — never edit manually
```

Route protection lives in **`src/proxy.ts`** (Next.js 16 renamed `middleware.ts` →
`proxy.ts`). It re-exports `auth as proxy` and its `matcher` runs the `authorized`
callback (`!!auth?.user`) on every path **except** those in the negative lookahead:
`api/auth`, `api/cron`, `_next/static`, `_next/image`, `favicon.ico`, `/login`, and
`/`. Anything not excluded redirects to `/login` when signed out — so new public or
token-guarded endpoints (e.g. cron/webhooks) must be added to the matcher exclusions,
otherwise they'll be bounced to the login page.

## Database

Models in `prisma/schema.prisma`:
- **Auth.js required**: `User`, `Account`, `Session`, `VerificationToken`
- **App**: `Match` (with `MatchStatus` and `MatchStage` enums), `Prediction`,
  `League`, `LeagueMember`, `BracketMatchPick`

Cascade note: every user relation has `onDelete: Cascade` **except `League.creator`**.
Deleting a user therefore requires removing the leagues they created first (see
`deleteUser` in `src/actions/admin.ts`). `BracketMatchPick.matchId` is a real FK to
`Match`, so synthetic bracket-slot keys can't be persisted — R32 slot picks are kept
as ephemeral client state in `<BracketTree>`.

Prisma client is generated to `src/generated/prisma/` — import from there:
```ts
import { PrismaClient } from "@/generated/prisma/client";
```
Never import from `@prisma/client` directly.

The db singleton in `src/lib/db.ts` uses `PrismaPg` (driver adapter pattern via `@prisma/adapter-pg`). Always import `prisma` from `@/lib/db`.

## Auth

- Two providers via NextAuth v5: **Google OAuth** and **Credentials** (email/password,
  hashed with bcrypt; signup via `registerUser` in `src/actions/auth.ts`)
- **JWT session strategy** — required because Credentials is used alongside the Prisma
  adapter. The `jwt` callback persists the user id into `token.sub`; the `session`
  callback copies it back to `session.user.id`
- Route protection: the `authorized` callback (`!!auth?.user`) + the `(app)` route group
- Admin actions (`finaliseMatch`, `finaliseBracketMatch`, `deleteUser`) and the `/admin`
  page check `session.user.email === process.env.ADMIN_EMAIL`

Required environment variables:
```
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAIL=
FOOTBALL_DATA_API_KEY=    # football-data.org client, used by the cron sync
CRON_SECRET=              # bearer token guarding /api/cron/sync
```

## Points System

### Match predictions — `src/lib/points.ts`
- **3 pts** — exact score
- **2 pts** — correct goal difference (implies correct winner / draw)
- **1 pt** — correct winner or draw
- **0 pts** — wrong

Calculated and written to `Prediction.points` when `finaliseMatch` is called.

### Bracket predictions — `STAGE_POINTS` in `src/lib/bracket.ts`
Points are earned when a predicted team **reaches** a round (plays in it), not only
if they win it. The exact path matters: predicting a team as Group A Winner when they
finish as runner-up scores 0 (they play in a different match slot).

| Round | R32 | R16 | QF | SF | Finalist | Champion |
|-------|----:|----:|---:|---:|---------:|---------:|
| Pts   | 1   | 2   | 3  | 5  | 8        | +12      |

Scoring in `finaliseBracketMatch`: for non-Final matches, a pick earns `pts` if
`predictedWinner ∈ {match.homeTeam, match.awayTeam}` (team reached this round).
The `FINAL` is special: **both** finalist pickers earn `FINAL` (8) pts, and the
champion picker earns an additional `CHAMPION` (12) pts. Written to
`BracketMatchPick.points`.

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
- Re-check admin/creator authorisation server-side — never rely on the UI hiding a control
- Call `revalidatePath` for affected routes after mutations
- Return a discriminated union `{ success: true } | { success: false; error: string }`
  (named per file: `PredictionState`, `BracketActionResult`, `LeagueActionResult`,
  `AdminActionResult`)
