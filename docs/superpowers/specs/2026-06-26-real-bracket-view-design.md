---
name: real-bracket-view
description: Add a real tournament bracket view alongside the prediction bracket, switchable via a tab toggle on /bracket
metadata:
  type: project
---

# Real Bracket View — Design Spec

## Overview

The tournament is now in the knockout/playoff stage. The `/bracket` page currently shows only the user's prediction bracket. We need to add a **Real Bracket** tab that shows the actual tournament results — which teams are in each slot, scores for completed matches, and the winner of each match highlighted.

A segmented tab toggle lets users switch between "My Predictions" and "Real Bracket" without any page navigation.

---

## Data Layer

### Schema change

Add an optional `winner` field to the `Match` model:

```prisma
model Match {
  // ... existing fields ...
  winner  String?   // team name of the match winner, null until decided
}
```

`winner` stores the winning team's name as a plain string (e.g. `"Spain"`), or `null` for unfinished/drawn group-stage matches. This is populated by the cron sync when a match reaches `FINISHED`.

### Cron sync update (`src/app/api/cron/sync/route.ts`)

`football-data.org` returns `score.winner` on each match: `"HOME_TEAM"`, `"AWAY_TEAM"`, `"DRAW"`, or `null`.

Translation logic added to the sync:
- `"HOME_TEAM"` → store `match.homeTeam` as `winner`
- `"AWAY_TEAM"` → store `match.awayTeam` as `winner`
- anything else (DRAW, null) → store `null`

The `winner` field is written whenever a match transitions to `FINISHED` (same condition gate as score writing). For already-finished knockout matches that predate this field, a one-time backfill can be triggered by re-syncing (the sync skips records with `status = FINISHED AND homeScore IS NOT NULL AND awayScore IS NOT NULL` — so we may need a targeted migration for historical data, or accept that the field populates as future matches finish).

The `FDMatch` type in `src/lib/football-data.ts` is extended to include `score.winner: string | null`.

---

## Component Architecture

### Page (`src/app/(app)/bracket/page.tsx`)

Stays a server component. Minor changes:
- Adds `winner` to the `knockoutMatches` query (it's already selected via `findMany` with no `select` constraint, so this comes for free after migration).
- Replaces direct `<BracketTree>` render with `<BracketPageClient>`, passing all required props for both views.

### New: `BracketPageClient` (`src/components/BracketPageClient.tsx`)

A `"use client"` wrapper that owns the tab state:

```ts
type Tab = "prediction" | "real"
const [tab, setTab] = useState<Tab>("prediction")
```

Renders:
1. Tab toggle UI (always visible)
2. When `tab === "prediction"`: scoring key chips + points banner + `<BracketTree>`
3. When `tab === "real"`: `<RealBracketTree>`

The scoring key and points banner are hidden on the real tab — they're prediction-specific.

### Extracted: `src/components/bracket-layout.tsx`

The following layout primitives currently live inside `BracketTree.tsx` and need to be shared with `RealBracketTree`:

- `LeftConnector`
- `RightConnector`
- `HorizLine`
- `BracketColumn`
- CSS variable constants (`TOTAL`, `CARD_W`, `CONN_W`)
- The `CardInfo` and `BMatch` types

These are moved to `bracket-layout.tsx` and re-exported from `BracketTree.tsx` to avoid breaking its existing API.

### New: `RealBracketTree` (`src/components/RealBracketTree.tsx`)

A read-only bracket display. Accepts all knockout matches with `winner` included. Internally:
- Slices matches into `r32`, `r16`, `qf`, `sf`, `finalMatch` arrays (same as the page does today — or receives them pre-sliced as props).
- Derives `CardInfo` arrays using actual team names from the DB (not picks).
- Renders the same column/connector layout as `BracketTree` using the shared layout primitives.
- Passes `isReadOnly={true}` to `BracketColumn`, which passes it to `RealBracketCard`.

### New: `RealBracketCard`

A purely presentational card. Same outer dimensions (`--bk-card` CSS variable). Two rows (home, away), each showing:

| State | Display |
|---|---|
| Team name known | Flag + name + score (if finished) |
| Team TBD | Muted label text, no score |
| Match LIVE | Pulsing dot badge + "LIVE" label; scores shown if available |

Winner row styling: `bg-accent/20 text-accent font-semibold` — identical to a selected prediction pick, keeping visual language consistent across both tabs.

No click handlers, no hover states on team rows.

---

## Tab Toggle UI

Positioned below the page `<h1>` header block, above the scoring key chips (which are hidden on the real tab).

```
[ My Predictions ]  [ Real Bracket ]
```

Styled as a compact segmented control:
- Shared outer rounded border (`rounded-xl border border-border`)
- Active tab: `bg-surface-2 text-foreground font-semibold`
- Inactive tab: `text-foreground-muted hover:text-foreground`
- Transition on color

---

## What Does Not Change

- `BracketTree.tsx` prediction logic — no modifications to pick handling, save/reset, or the picker modal.
- All existing server actions (`saveBracketPicks`, `finaliseBracketMatch`, etc.).
- Route protection, auth, or any other page.
- The scoring key and points banner remain under "My Predictions" exactly as today.

---

## Edge Cases

- **Matches with no teams yet (TBD):** Shown as muted placeholder rows — same visual treatment as prediction bracket R16+ TBD slots.
- **LIVE matches:** Show scores if available; pulsing dot indicator.
- **Historical knockout matches without `winner` populated yet:** `winner` will be `null`; no winner highlighted. Acceptable during transition — future syncs will populate it.
- **Group-stage matches:** Not shown in the bracket view (query already filters `stage: { not: "GROUP" }`).
