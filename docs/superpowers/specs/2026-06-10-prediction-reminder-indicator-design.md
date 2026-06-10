# Prediction reminder & league status indicator — design

**Date:** 2026-06-10
**Status:** Approved (design)

## Problem

Players forget to enter match-score predictions before kickoff. There is no
reminder, and within a league there is no way to see who has and hasn't predicted
the upcoming matches. We want a low-friction indicator that (a) nudges the current
user about their own outstanding predictions, and (b) shows each league member's
prediction status — without revealing anyone's actual picks before the match.

## Scope

- **In scope:** match-score predictions only (the `Prediction` model) — group and
  knockout per-match score predictions.
- **Out of scope:** the knockout `BracketMatchPick` flow. It's a one-time set of
  picks that locks at the first knockout kickoff, not a per-match recurring action,
  so it doesn't fit a "don't forget before this match" reminder.
- **No schema change / no migration.** Everything is derived from existing
  `Match` and `Prediction` rows (read-only feature).

### The "prediction window"

The set of matches the indicator tracks:

> Matches with `status = UPCOMING` and `scheduledAt` between **now** and **now + 48h**.

`UPCOMING` guarantees the match hasn't started/finished (predictions lock at
kickoff); the 48h bound keeps the nudge about imminent matches rather than the
whole tournament. `WINDOW_HOURS = 48` is a single named constant.

### Privacy

The feature only ever reads the **existence** of a `Prediction` row
(`userId` + `matchId`), never `homeScore`/`awayScore`. No one's picks are exposed
before the match.

## Components

### 1. Shared module — `src/lib/prediction-status.ts`

Centralises the window logic and queries so the navbar and league page share one
source of truth.

- `WINDOW_HOURS = 48` constant.
- `async windowMatchIds(): Promise<string[]>`
  — ids of `UPCOMING` matches with `scheduledAt` in `[now, now + WINDOW_HOURS]`.
- `async countMissingPredictions(userId: string): Promise<number>`
  — `windowIds.length − (count of the user's predictions whose matchId ∈ windowIds)`.
  Returns `0` when the window is empty.
- `async memberPredictionStatus(memberIds: string[], windowIds: string[]): Promise<Record<string, "ready" | "pending">>`
  — one `prediction.findMany({ where: { matchId: { in: windowIds }, userId: { in: memberIds } }, select: { userId: true, matchId: true } })`,
  grouped per user. A member is `"ready"` when they have a prediction for **every**
  window match, else `"pending"`. Takes `windowIds` as a parameter so the league
  page computes the window once and reuses it.

### 2. Personal nudge — navbar badge

- `Navbar` (already an async server component with `session`) calls
  `countMissingPredictions(session.user.id)` and passes `pendingCount` into
  `NavLinks` (both the desktop and mobile instances already render `NavLinks`).
- `NavLinks` accepts an optional `pendingCount` prop. On the `/matches` link, when
  `pendingCount > 0`, render a small gold pill with the number after the label
  (e.g. `Matches ②`). `0` → no badge.
- Uses theme tokens (`bg-gold/20 text-gold` style pill), no hardcoded colours.

### 3. League visibility — per-member status

On `src/app/(app)/leagues/[slug]/page.tsx`:

- Compute `windowIds = await windowMatchIds()` and
  `status = await memberPredictionStatus(memberIds, windowIds)`.
- When `windowIds.length > 0`, each leaderboard row shows a small status marker
  under the member name:
  - `ready` → green `✓ ready`
  - `pending` → muted `pending`
- When `windowIds.length === 0` (no matches in the next 48h) → show no status
  marker at all, so the list isn't a wall of "pending" when there's nothing to do.

## Data flow

```
Navbar (server)        → countMissingPredictions(userId)      → NavLinks badge
league/[slug] (server) → windowMatchIds() + memberPredictionStatus(memberIds, ids)
                                                               → per-row marker
```

Both pages are already dynamically rendered. The badge/markers refresh on the next
request/navigation. `upsertPrediction` already calls `revalidatePath("/matches")`,
so after predicting, navigating re-renders the navbar with the updated count.

## Error handling / edge cases

- Empty window → count is `0` (no badge), no league markers.
- Not signed in → navbar already only renders user UI when `session?.user` exists;
  the badge is computed only for a logged-in user id.
- A member with zero window predictions and a non-empty window → `pending`.
- Counting is by distinct `matchId` within the window; the `@@unique([userId, matchId])`
  constraint on `Prediction` guarantees at most one row per user/match, so a plain
  count equals distinct-match count.

## Testing

- `countMissingPredictions`: window with N matches, user predicted k of them → N − k;
  empty window → 0.
- `memberPredictionStatus`: member predicting all window matches → `ready`; missing
  one → `pending`; empty `windowIds` → every member `ready`-or-omitted (caller hides
  markers when window empty).
- Manual: with an UPCOMING match inside 48h and no prediction, navbar shows a badge
  on Matches; after predicting, badge clears on navigation; league page shows
  `pending` then `✓ ready`.

## Out of scope / future

- Email/push reminders.
- Tracking bracket completeness.
- Per-match "who predicted" breakdown (kept to a single ready/pending per member).
