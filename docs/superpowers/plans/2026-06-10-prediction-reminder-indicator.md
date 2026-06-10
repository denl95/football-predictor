# Prediction Reminder & League Status Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current user a navbar badge counting their unmade match predictions for the next 48h, and show each league member a `ready`/`pending` status on the league page.

**Architecture:** One shared server module (`src/lib/prediction-status.ts`) owns the "prediction window" logic (UPCOMING matches within 48h) and the Prisma queries. The already-server-rendered `Navbar` and league page call it; `NavLinks` (client) just renders a badge from a prop. Read-only — derived from existing `Match`/`Prediction` rows, no schema change.

**Tech Stack:** Next.js 16 (server components), Prisma 7 (driver adapter, import from `@/lib/db`), Tailwind v4 theme tokens, Biome.

**Verification note:** This project has **no test runner** (no vitest/jest, no `test` script) and no existing project tests. Per-task verification is `bun lint` + `bun build` plus the manual checks given in the final task — matching how the rest of the codebase is verified. Do not add a test framework.

**Conventions (from AGENTS.md / CLAUDE.md):** tabs, double quotes, ESM, no `any`; import `prisma` from `@/lib/db`; never import `@prisma/client`; use theme tokens (`text-accent`, `bg-gold/20`, …) never hex. Run `bun lint:fix` before committing.

---

### Task 1: Shared prediction-status module

**Files:**
- Create: `src/lib/prediction-status.ts`

- [ ] **Step 1: Create the module with the window logic and queries**

Create `src/lib/prediction-status.ts` with exactly this content:

```ts
import { prisma } from "@/lib/db";

/** How far ahead a match counts as "needs predicting soon". */
export const WINDOW_HOURS = 48;

export type MemberStatus = "ready" | "pending";

/** IDs of matches that are UPCOMING and kick off within the next WINDOW_HOURS. */
export async function windowMatchIds(now: Date = new Date()): Promise<string[]> {
	const end = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
	const matches = await prisma.match.findMany({
		where: {
			status: "UPCOMING",
			scheduledAt: { gte: now, lte: end },
		},
		select: { id: true },
	});
	return matches.map((m) => m.id);
}

/** Number of window matches the user has NOT predicted yet (0 if none open). */
export async function countMissingPredictions(
	userId: string,
	now: Date = new Date(),
): Promise<number> {
	const ids = await windowMatchIds(now);
	if (ids.length === 0) return 0;
	const predicted = await prisma.prediction.count({
		where: { userId, matchId: { in: ids } },
	});
	return ids.length - predicted;
}

/**
 * Per-member prediction status for the given window matches: "ready" when the
 * member has predicted every window match, otherwise "pending". Returns an empty
 * map when there are no window matches or no members — callers should hide the
 * markers in that case. Only the existence of a prediction is read, never scores.
 */
export async function memberPredictionStatus(
	memberIds: string[],
	windowIds: string[],
): Promise<Record<string, MemberStatus>> {
	const status: Record<string, MemberStatus> = {};
	if (windowIds.length === 0 || memberIds.length === 0) return status;

	const rows = await prisma.prediction.findMany({
		where: { userId: { in: memberIds }, matchId: { in: windowIds } },
		select: { userId: true, matchId: true },
	});

	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.userId] = (counts[row.userId] ?? 0) + 1;

	for (const id of memberIds) {
		status[id] = (counts[id] ?? 0) >= windowIds.length ? "ready" : "pending";
	}
	return status;
}
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `bun lint src/lib/prediction-status.ts && bun build`
Expected: lint reports no errors for this file; `bun build` ends with `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prediction-status.ts
git commit -m "feat: add prediction-status helpers for 48h window"
```

---

### Task 2: Navbar badge for the current user's missing predictions

**Files:**
- Modify: `src/components/NavLinks.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add a `pendingCount` prop + badge to `NavLinks`**

In `src/components/NavLinks.tsx`, change the component signature and the link rendering. Replace the existing `export function NavLinks({ ... }) { ... }` body with:

```tsx
export function NavLinks({
	className,
	isAdmin = false,
	pendingCount = 0,
}: Readonly<{ className?: string; isAdmin?: boolean; pendingCount?: number }>) {
	const pathname = usePathname();
	const links = isAdmin
		? [...LINKS, { href: "/admin", label: "Admin" }]
		: LINKS;
	const navClass = className
		? `flex items-center gap-1 text-sm ${className}`
		: "flex items-center gap-1 text-sm";
	return (
		<nav className={navClass}>
			{links.map(({ href, label }) => {
				const isActive = pathname === href || pathname.startsWith(`${href}/`);
				const showBadge = href === "/matches" && pendingCount > 0;
				return (
					<Link
						key={href}
						href={href}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
							isActive
								? "bg-surface-2 text-foreground"
								: "text-foreground-muted hover:bg-surface-2 hover:text-foreground"
						}`}
					>
						{label}
						{showBadge ? (
							<span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gold">
								{pendingCount}
							</span>
						) : null}
					</Link>
				);
			})}
		</nav>
	);
}
```

(Only two things changed vs the original: the `pendingCount` prop, and the `Link` now uses `inline-flex items-center gap-1.5` plus the conditional badge `<span>`.)

- [ ] **Step 2: Compute the count in `Navbar` and pass it down**

In `src/components/Navbar.tsx`, add the import at the top (with the other imports):

```tsx
import { countMissingPredictions } from "@/lib/prediction-status";
```

Immediately after the existing `const isAdmin = ...;` line, add:

```tsx
	const pendingCount = session?.user?.id
		? await countMissingPredictions(session.user.id)
		: 0;
```

Then pass the prop to **both** `NavLinks` usages. Change the desktop one:

```tsx
					<div className="hidden md:block">
						<NavLinks isAdmin={isAdmin} pendingCount={pendingCount} />
					</div>
```

and the mobile one:

```tsx
				<div className="md:hidden overflow-x-auto border-t border-border/40 py-1.5 -mx-4 px-2">
					<NavLinks className="min-w-max" isAdmin={isAdmin} pendingCount={pendingCount} />
				</div>
```

- [ ] **Step 3: Verify build + lint**

Run: `bun lint:fix && bun build`
Expected: no new lint errors; `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/components/NavLinks.tsx src/components/Navbar.tsx
git commit -m "feat: navbar badge for unmade predictions in next 48h"
```

---

### Task 3: Per-member ready/pending status on the league page

**Files:**
- Modify: `src/app/(app)/leagues/[slug]/page.tsx`

- [ ] **Step 1: Import the helpers**

In `src/app/(app)/leagues/[slug]/page.tsx`, add to the imports (next to `import { prisma } from "@/lib/db";`):

```tsx
import {
	memberPredictionStatus,
	windowMatchIds,
} from "@/lib/prediction-status";
```

- [ ] **Step 2: Compute window + status after `memberIds` is defined**

The file already has `const memberIds = league.members.map((m) => m.userId);`. Immediately after that line, add:

```tsx
	const windowIds = await windowMatchIds();
	const predictionStatus = await memberPredictionStatus(memberIds, windowIds);
	const hasPredictionWindow = windowIds.length > 0;
```

- [ ] **Step 3: Render the marker under each member's name**

In the leaderboard `ol`, find the block:

```tsx
											<div className="text-xs text-foreground-muted">
												{player.predictionsScored} result
												{player.predictionsScored !== 1 ? "s" : ""} scored
											</div>
```

Replace it with:

```tsx
											<div className="flex items-center gap-2 text-xs text-foreground-muted">
												<span>
													{player.predictionsScored} result
													{player.predictionsScored !== 1 ? "s" : ""} scored
												</span>
												{hasPredictionWindow ? (
													predictionStatus[player.id] === "ready" ? (
														<span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
															✓ ready
														</span>
													) : (
														<span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
															pending
														</span>
													)
												) : null}
											</div>
```

- [ ] **Step 4: Verify build + lint**

Run: `bun lint:fix && bun build`
Expected: no new lint errors; `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/leagues/[slug]/page.tsx"
git commit -m "feat: show member ready/pending prediction status on league page"
```

---

### Task 4: Update docs + manual verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Note the new module in CLAUDE.md**

In `CLAUDE.md`, under the `src/lib/` listing in "Project Structure", add a line after the `bracket.ts` entry:

```
    prediction-status.ts # 48h prediction window: navbar badge + league ready/pending
```

- [ ] **Step 2: Manual verification (dev server)**

Run: `bun dev`, sign in, then check:

1. With at least one `UPCOMING` match scheduled within 48h that you have **not** predicted → the **Matches** nav link shows a gold count badge (desktop and mobile rows).
2. Predict all those matches, navigate to another page and back → badge disappears (count 0).
3. Open a league page:
   - While a 48h window exists: each member shows `✓ ready` (predicted all) or `pending`.
   - A member who predicted every window match shows `✓ ready`; one missing any shows `pending`.
4. When no `UPCOMING` match falls within 48h → no badge in navbar and no ready/pending markers on the league page.
5. Confirm no member's actual scoreline is shown anywhere new (only ready/pending).

Expected: all five behave as described.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note prediction-status module in CLAUDE.md"
```

---

## Self-Review

**Spec coverage:**
- Window = UPCOMING within 48h → `windowMatchIds` (Task 1). ✓
- Personal navbar badge (count) on Matches link, desktop + mobile → Task 2. ✓
- League per-member done/pending, hidden when window empty → Task 3 (`hasPredictionWindow`). ✓
- Privacy (only existence read) → queries select only `userId`/`matchId`, never scores (Task 1). ✓
- No migration → no schema edits in any task. ✓
- Scope = match predictions only (not bracket) → only `Prediction`/`Match` queried. ✓

**Type consistency:** `windowMatchIds()`, `countMissingPredictions(userId)`, `memberPredictionStatus(memberIds, windowIds)`, and `MemberStatus` are used with identical names/signatures across Tasks 1–3. `pendingCount` prop name matches between `Navbar` and `NavLinks`. ✓

**Placeholders:** none — every step shows full code. ✓
