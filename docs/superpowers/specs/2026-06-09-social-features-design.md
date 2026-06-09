# Social Features Design

**Date:** 2026-06-09
**Approach:** Incremental — ship in order of complexity (no schema changes first, schema changes last)

---

## Feature 1: Head-to-head comparison

### Route
`/players/[id]` — compare your predictions against another player's.

### Entry point
Every row on the leaderboard becomes a link. Clicking your own row redirects to `/my-predictions`. Clicking any other player navigates to `/players/[id]`.

### Page layout
- **Header:** your avatar + name on the left, opponent avatar + name on the right, total points for each displayed prominently in the middle.
- **Match rows (ordered by `scheduledAt` asc):** one row per match that either player predicted, showing:
  - Match label (home team vs away team + flags)
  - Your prediction score
  - Actual result (once `FINISHED`; otherwise "—")
  - Their prediction score
  - Points badge for each side
- Matches where a player did not predict show "—" for their column.
- **Privacy rule:** for matches that are not yet `FINISHED`, the opponent's prediction is hidden and shown as "?" — only revealed after the match ends.
- Current user's column is visually distinguished (accent tint).

### Data
No schema changes. Query: `Match.findMany` joined with two `Prediction` sets — one filtered to `userId = session.user.id`, one filtered to `userId = params.id`. The page is server-rendered.

### Authorization
Any authenticated user can view any other user's comparison. If `params.id` doesn't exist, return 404.

---

## Feature 2: Post-match prediction feed

### Placement
Below the result / prediction form on `/matches/[id]`. Rendered only when `match.status === "FINISHED"`.

### Layout
- Section header: "How everyone predicted"
- One row per user who submitted a prediction for this match, sorted by `points` descending (best predictors at the top).
- Each row: avatar, player name, prediction (e.g. "2 – 1"), points badge.
- The current user's row is highlighted with `bg-accent/10` (same treatment as the leaderboard).
- Players who did not predict this match are not shown.

### Data
No schema changes. Query: `Prediction.findMany({ where: { matchId }, include: { user: true }, orderBy: { points: "desc" } })` — only run when match is `FINISHED`.

### Privacy
The feed section is entirely absent from the DOM for upcoming and live matches, preventing any server-side leakage of predictions before kick-off.

---

## Feature 3: Mini-leagues

### Schema additions

```prisma
model League {
  id        String         @id @default(cuid())
  name      String
  slug      String         @unique
  createdBy String
  creator   User           @relation("CreatedLeagues", fields: [createdBy], references: [id])
  members   LeagueMember[]
  createdAt DateTime       @default(now())
}

model LeagueMember {
  leagueId String
  userId   String
  league   League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt DateTime @default(now())

  @@id([leagueId, userId])
}
```

`User` gains two relations: `createdLeagues League[]` and `leagueMemberships LeagueMember[]`.

### Slug generation
Auto-generated on creation: `[sanitised-name]-[4 random alphanumeric chars]` (e.g. `work-friends-x7k2`). Collision retry once; fail loudly if both collide (astronomically unlikely).

### Routes

| Route | Description |
|---|---|
| `/leagues` | List of leagues the current user belongs to. "Create league" button. |
| `/leagues/new` | Form: league name only. Submitting creates the league and redirects to `/leagues/[slug]`. |
| `/leagues/[slug]` | League leaderboard (members only, same design as global) + shareable join link with copy button. |
| `/leagues/join/[slug]` | Confirmation screen: "Join *League Name*?" with a single Join button. If already a member, redirects to `/leagues/[slug]`. |

### Creating a league
Server action `createLeague(name)`:
1. Validate session.
2. Validate name (non-empty, max 50 chars).
3. Generate slug.
4. Create `League` row.
5. Create `LeagueMember` row for the creator.
6. Redirect to `/leagues/[slug]`.

### Joining a league
Server action `joinLeague(slug)`:
1. Validate session.
2. Look up league by slug — 404 if not found.
3. Upsert `LeagueMember` (no-op if already a member).
4. Redirect to `/leagues/[slug]`.

### League leaderboard
Same query pattern as the global leaderboard but with an added `where: { leagueMemberships: { some: { leagueId } } }` filter on users.

### Navbar
Add a "Leagues" link to `Navbar.tsx` alongside the existing nav items.

---

## Default league migration

### Goal
All users who exist at migration time are added to a pre-created "Global" league. This league functions as the equivalent of the current global leaderboard.

### Approach
A one-time script (`scripts/seed-default-league.ts`) run after the Prisma schema migration:
1. Upsert a `League` row with a fixed slug `global` and name `"Global"`, `createdBy` set to the admin user's id (looked up by `ADMIN_EMAIL`). If no user with that email exists yet, the script exits with a clear error — run it after the admin has signed in at least once.
2. Fetch all existing `User` ids.
3. Bulk-insert `LeagueMember` rows for every user.

### New users
New sign-ups after the migration are **not** auto-added to any league. They join via shareable links.

---

## Out of scope
- League admin controls (kick members, rename, delete)
- Private vs public league visibility settings
- Notifications when someone joins your league
- Pagination on any of the new pages (acceptable for competition scale)
