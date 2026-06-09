# Social Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three social features — head-to-head player comparison, a post-match prediction feed, and mini-leagues with shareable join links.

**Architecture:** Phase 1 and 2 require no schema changes — they add new pages and enhance existing ones using already-stored data. Phase 3 adds `League` and `LeagueMember` Prisma models, a server actions file, four new pages, a `CopyButton` client component, a default-league seed script, and a navbar update.

**Tech Stack:** Next.js 16 App Router (server components, server actions), Prisma 7 with PrismaPg driver adapter, NextAuth v5 beta, Tailwind v4, Bun, TypeScript, Biome.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/app/(app)/leaderboard/page.tsx` | Make rows linkable |
| Create | `src/app/(app)/players/[id]/page.tsx` | Head-to-head comparison |
| Modify | `src/app/(app)/matches/[id]/page.tsx` | Enhance prediction feed (avatars, current-user highlight, no take limit) |
| Modify | `prisma/schema.prisma` | Add `League` + `LeagueMember` models, two relations on `User` |
| Create | `src/actions/leagues.ts` | `createLeagueAction`, `joinLeague` server actions |
| Create | `src/components/CopyButton.tsx` | Client component — copy join URL to clipboard |
| Create | `src/app/(app)/leagues/page.tsx` | List user's leagues |
| Create | `src/app/(app)/leagues/new/page.tsx` | Create league form (client component) |
| Create | `src/app/(app)/leagues/[slug]/page.tsx` | League leaderboard + join link |
| Create | `src/app/(app)/leagues/join/[slug]/page.tsx` | Join confirmation |
| Modify | `src/components/Navbar.tsx` | Add Leagues nav link |
| Create | `scripts/seed-default-league.ts` | One-time script: add all existing users to a Global league |
| Modify | `package.json` | Add `db:seed-leagues` script |

---

## Phase 1 — Head-to-head comparison

### Task 1: Make leaderboard rows linkable

**Files:**
- Modify: `src/app/(app)/leaderboard/page.tsx`

- [ ] **Step 1: Add `Link` import and wrap each row**

Replace the current `<li>` body with a `<Link>` that covers the full row. The current user's row links to `/my-predictions`; all others link to `/players/[id]`.

Open `src/app/(app)/leaderboard/page.tsx`. The `<li>` currently has `flex items-center gap-4 ...` classes and its children are the rank/avatar/name/points block. Move those flex classes onto a `<Link>` inside the `<li>`.

Full replacement for the `<li>` block (lines 56–102):

```tsx
<li
  key={player.id}
  className={`border-b border-border last:border-b-0 transition-colors ${isCurrentUser ? "bg-accent/10" : "hover:bg-surface-2"}`}
>
  <Link
    href={isCurrentUser ? "/my-predictions" : `/players/${player.id}`}
    className="flex items-center gap-4 px-5 py-4"
  >
    <span className="w-8 text-center text-lg">
      {medals[i] ?? (
        <span className="text-foreground-muted text-sm">
          {i + 1}
        </span>
      )}
    </span>

    {player.image ? (
      <Image
        src={player.image}
        alt={player.name}
        width={36}
        height={36}
        className="rounded-full"
      />
    ) : (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
        {player.name[0]?.toUpperCase()}
      </div>
    )}

    <div className="flex-1">
      <div className="flex items-center gap-2 font-semibold">
        {player.name}
        {isCurrentUser && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
            you
          </span>
        )}
      </div>
      <div className="text-xs text-foreground-muted">
        {player.predictionsScored} result
        {player.predictionsScored !== 1 ? "s" : ""} scored
      </div>
    </div>

    <div
      className={`text-xl font-bold tabular-nums ${i === 0 ? "text-gold" : i < 3 ? "text-accent" : "text-foreground"}`}
    >
      {player.totalPoints}
      <span className="ml-1 text-sm font-normal text-foreground-muted">
        pts
      </span>
    </div>
  </Link>
</li>
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors. If TypeScript complains about `Link` not being imported, add `import Link from "next/link";` at the top (it's already imported in this file — check first).

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/leaderboard/page.tsx
git commit -m "feat: make leaderboard rows link to head-to-head page"
```

---

### Task 2: Create the head-to-head page

**Files:**
- Create: `src/app/(app)/players/[id]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toFlag } from "@/lib/football-data";

export default async function PlayerPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id: opponentId } = await params;
	const session = await auth();
	if (!session?.user?.id) return null;

	if (opponentId === session.user.id) redirect("/my-predictions");

	const [opponent, allMatches] = await Promise.all([
		prisma.user.findUnique({
			where: { id: opponentId },
			select: { id: true, name: true, image: true },
		}),
		prisma.match.findMany({
			orderBy: { scheduledAt: "asc" },
			include: {
				predictions: {
					where: { userId: { in: [session.user.id, opponentId] } },
					select: {
						userId: true,
						homeScore: true,
						awayScore: true,
						points: true,
					},
				},
			},
		}),
	]);

	if (!opponent) notFound();

	type Row = {
		match: (typeof allMatches)[number];
		myPred: { userId: string; homeScore: number; awayScore: number; points: number | null } | null;
		theirPred: { userId: string; homeScore: number; awayScore: number; points: number | null } | null;
	};

	const rows: Row[] = allMatches
		.map((m) => ({
			match: m,
			myPred: m.predictions.find((p) => p.userId === session.user.id) ?? null,
			theirPred: m.predictions.find((p) => p.userId === opponentId) ?? null,
		}))
		.filter((r) => r.myPred !== null || r.theirPred !== null);

	const myTotal = rows.reduce((sum, r) => sum + (r.myPred?.points ?? 0), 0);
	const theirTotal = rows.reduce(
		(sum, r) => sum + (r.theirPred?.points ?? 0),
		0,
	);

	function PointsBadge({ points }: { points: number | null | undefined }) {
		if (points === null || points === undefined)
			return (
				<span className="w-12 rounded-lg bg-surface-2 px-2 py-0.5 text-center text-xs text-foreground-muted">
					–
				</span>
			);
		return (
			<span
				className={`w-12 rounded-lg px-2 py-0.5 text-center text-sm font-bold ${points === 3 ? "bg-gold/20 text-gold" : points >= 1 ? "bg-accent/20 text-accent" : "bg-red-500/20 text-red-400"}`}
			>
				{points} pts
			</span>
		);
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6">
				{/* Me */}
				<div className="flex flex-col items-center gap-2">
					{session.user.image ? (
						<Image
							src={session.user.image}
							alt={session.user.name ?? "You"}
							width={48}
							height={48}
							className="rounded-full"
						/>
					) : (
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 font-bold">
							{(session.user.name ?? "Y")[0]?.toUpperCase()}
						</div>
					)}
					<span className="max-w-[100px] truncate text-sm font-semibold">
						{session.user.name ?? "You"}
					</span>
					<span className="text-2xl font-bold tabular-nums text-accent">
						{myTotal}
						<span className="ml-1 text-sm font-normal text-foreground-muted">
							pts
						</span>
					</span>
				</div>

				<span className="text-lg font-bold text-foreground-muted">vs</span>

				{/* Opponent */}
				<div className="flex flex-col items-center gap-2">
					{opponent.image ? (
						<Image
							src={opponent.image}
							alt={opponent.name ?? ""}
							width={48}
							height={48}
							className="rounded-full"
						/>
					) : (
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 font-bold">
							{(opponent.name ?? "?")[0]?.toUpperCase()}
						</div>
					)}
					<span className="max-w-[100px] truncate text-sm font-semibold">
						{opponent.name ?? "Anonymous"}
					</span>
					<span className="text-2xl font-bold tabular-nums text-foreground">
						{theirTotal}
						<span className="ml-1 text-sm font-normal text-foreground-muted">
							pts
						</span>
					</span>
				</div>
			</div>

			{rows.length === 0 ? (
				<p className="text-center text-foreground-muted">
					No predictions to compare yet.
				</p>
			) : (
				<div className="overflow-hidden rounded-2xl border border-border bg-surface">
					<ul>
						{rows.map(({ match, myPred, theirPred }) => {
							const isFinished = match.status === "FINISHED";
							return (
								<li
									key={match.id}
									className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
								>
									{/* My prediction */}
									<div className="flex flex-col items-start gap-1">
										{myPred ? (
											<>
												<span className="tabular-nums font-semibold text-sm">
													{myPred.homeScore} – {myPred.awayScore}
												</span>
												<PointsBadge points={isFinished ? myPred.points : undefined} />
											</>
										) : (
											<span className="text-xs text-foreground-muted">–</span>
										)}
									</div>

									{/* Match info */}
									<div className="flex flex-col items-center gap-0.5 text-center">
										<span className="text-xs font-medium">
											{toFlag(match.homeTeam)} {match.homeTeam}
										</span>
										<span className="text-xs text-foreground-muted">vs</span>
										<span className="text-xs font-medium">
											{match.awayTeam} {toFlag(match.awayTeam)}
										</span>
										{isFinished && (
											<span className="mt-0.5 text-xs tabular-nums font-bold text-foreground-muted">
												{match.homeScore} – {match.awayScore}
											</span>
										)}
									</div>

									{/* Their prediction */}
									<div className="flex flex-col items-end gap-1">
										{theirPred ? (
											<>
												<span className="tabular-nums font-semibold text-sm">
													{isFinished
														? `${theirPred.homeScore} – ${theirPred.awayScore}`
														: "?"}
												</span>
												<PointsBadge points={isFinished ? theirPred.points : undefined} />
											</>
										) : (
											<span className="text-xs text-foreground-muted">–</span>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/players/[id]/page.tsx
git commit -m "feat: add head-to-head player comparison page"
```

---

## Phase 2 — Post-match prediction feed

### Task 3: Enhance the prediction feed on the match detail page

The match detail page already fetches `allPredictions` but limits to 10, has no user IDs for current-user detection, and has no avatars. Update the query and the render block.

**Files:**
- Modify: `src/app/(app)/matches/[id]/page.tsx`

- [ ] **Step 1: Update the `allPredictions` query**

Replace lines 24–29:

```ts
const allPredictions =
	match.status === "FINISHED"
		? await prisma.prediction.findMany({
				where: { matchId: id, points: { not: null } },
				include: {
					user: { select: { id: true, name: true, image: true } },
				},
				orderBy: { points: "desc" },
			})
		: [];
```

(Removed `take: 10`; added `id` to the user select; query only runs when finished.)

- [ ] **Step 2: Replace the "Top predictions" section**

Replace the `{allPredictions.length > 0 && (...)}` block (lines 116–145) with:

```tsx
{allPredictions.length > 0 && (
	<div className="overflow-hidden rounded-2xl border border-border bg-surface">
		<div className="border-b border-border px-5 py-3">
			<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
				How everyone predicted
			</h2>
		</div>
		<ul>
			{allPredictions.map((p) => {
				const isCurrentUser = p.user.id === session?.user?.id;
				return (
					<li
						key={p.id}
						className={`flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0 ${isCurrentUser ? "bg-accent/10" : ""}`}
					>
						{p.user.image ? (
							<Image
								src={p.user.image}
								alt={p.user.name ?? ""}
								width={32}
								height={32}
								className="rounded-full"
							/>
						) : (
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
								{(p.user.name ?? "?")[0]?.toUpperCase()}
							</div>
						)}
						<span className="flex-1 font-semibold text-sm">
							{p.user.name ?? "Anonymous"}
							{isCurrentUser && (
								<span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
									you
								</span>
							)}
						</span>
						<span className="tabular-nums text-sm text-foreground-muted">
							{p.homeScore} – {p.awayScore}
						</span>
						<span
							className={`w-12 rounded-lg px-2 py-0.5 text-center text-sm font-bold ${p.points === 3 ? "bg-gold/20 text-gold" : (p.points ?? 0) >= 1 ? "bg-accent/20 text-accent" : "bg-red-500/20 text-red-400"}`}
						>
							{p.points} pts
						</span>
					</li>
				);
			})}
		</ul>
	</div>
)}
```

Also add `import Image from "next/image";` at the top of the file (it's not currently imported there).

- [ ] **Step 3: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/matches/[id]/page.tsx
git commit -m "feat: enhance match prediction feed with avatars and current-user highlight"
```

---

## Phase 3 — Mini-leagues

### Task 4: Add League and LeagueMember to the Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the two new models and update `User`**

Append to `prisma/schema.prisma` (after the `Prediction` model):

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

In the `User` model, add these two lines alongside the other relation fields:

```prisma
  createdLeagues    League[]       @relation("CreatedLeagues")
  leagueMemberships LeagueMember[]
```

- [ ] **Step 2: Run the migration**

```bash
bun db:migrate
```

When prompted for a migration name, enter: `add_leagues`

Expected: migration applied, Prisma client regenerated.

- [ ] **Step 3: Verify types are available**

```bash
bun build
```

Expected: no errors — the generated client now includes `League` and `LeagueMember`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add League and LeagueMember schema models"
```

---

### Task 5: Create league server actions

**Files:**
- Create: `src/actions/leagues.ts`

- [ ] **Step 1: Create the file**

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateSlug(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 30);
	const suffix = Math.random().toString(36).slice(2, 6);
	return `${base}-${suffix}`;
}

// Used with useActionState — redirects on success, returns error state on failure.
export async function createLeagueAction(
	_: { error?: string },
	formData: FormData,
): Promise<{ error: string }> {
	const session = await auth();
	if (!session?.user?.id) return { error: "Unauthorised" };

	const name = (formData.get("name") as string | null)?.trim() ?? "";
	if (!name || name.length > 50)
		return { error: "Name must be 1–50 characters" };

	let slug = generateSlug(name);
	let existing = await prisma.league.findUnique({ where: { slug } });
	if (existing) {
		slug = generateSlug(name);
		existing = await prisma.league.findUnique({ where: { slug } });
		if (existing) return { error: "Could not generate a unique slug — please try again" };
	}

	const league = await prisma.league.create({
		data: {
			name,
			slug,
			createdBy: session.user.id,
			members: { create: { userId: session.user.id } },
		},
	});

	revalidatePath("/leagues");
	redirect(`/leagues/${league.slug}`);
}

export async function joinLeague(
	slug: string,
): Promise<{ success: true } | { success: false; error: string }> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	const league = await prisma.league.findUnique({ where: { slug } });
	if (!league) return { success: false, error: "League not found" };

	await prisma.leagueMember.upsert({
		where: {
			leagueId_userId: { leagueId: league.id, userId: session.user.id },
		},
		create: { leagueId: league.id, userId: session.user.id },
		update: {},
	});

	revalidatePath(`/leagues/${slug}`);
	return { success: true };
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/leagues.ts
git commit -m "feat: add createLeagueAction and joinLeague server actions"
```

---

### Task 6: Create the CopyButton client component

**Files:**
- Create: `src/components/CopyButton.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<button
			type="button"
			onClick={copy}
			className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
		>
			{copied ? "Copied!" : "Copy link"}
		</button>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CopyButton.tsx
git commit -m "feat: add CopyButton client component"
```

---

### Task 7: Create the leagues list page

**Files:**
- Create: `src/app/(app)/leagues/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LeaguesPage() {
	const session = await auth();
	if (!session?.user?.id) return null;

	const memberships = await prisma.leagueMember.findMany({
		where: { userId: session.user.id },
		include: {
			league: {
				include: { _count: { select: { members: true } } },
			},
		},
		orderBy: { joinedAt: "asc" },
	});

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold">Leagues</h1>
					<p className="text-sm text-foreground-muted">
						{memberships.length} league
						{memberships.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Link
					href="/leagues/new"
					className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white"
				>
					+ Create
				</Link>
			</div>

			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{memberships.length === 0 ? (
					<p className="px-6 py-12 text-center text-foreground-muted">
						You're not in any leagues yet.
					</p>
				) : (
					<ul>
						{memberships.map(({ league }) => (
							<li key={league.id} className="border-b border-border last:border-b-0">
								<Link
									href={`/leagues/${league.slug}`}
									className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface-2"
								>
									<span className="font-semibold">{league.name}</span>
									<span className="text-sm text-foreground-muted">
										{league._count.members} member
										{league._count.members !== 1 ? "s" : ""}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/leagues/page.tsx
git commit -m "feat: add leagues list page"
```

---

### Task 8: Create the new-league form page

**Files:**
- Create: `src/app/(app)/leagues/new/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createLeagueAction } from "@/actions/leagues";

export default function NewLeaguePage() {
	const [state, action, pending] = useActionState(createLeagueAction, {});

	return (
		<div className="mx-auto flex max-w-md flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Create a league</h1>
				<p className="text-sm text-foreground-muted">
					Give your league a name and share the link with friends.
				</p>
			</div>

			<form action={action} className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="name" className="text-sm font-medium">
						League name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						placeholder="e.g. Work Friends"
						maxLength={50}
						required
						className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
					/>
					{state.error && (
						<p className="text-sm text-red-400">{state.error}</p>
					)}
				</div>

				<button
					type="submit"
					disabled={pending}
					className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
				>
					{pending ? "Creating…" : "Create league"}
				</button>
			</form>

			<Link href="/leagues" className="text-center text-sm text-foreground-muted hover:text-foreground">
				← Back to leagues
			</Link>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/leagues/new/page.tsx
git commit -m "feat: add create-league form page"
```

---

### Task 9: Create the league leaderboard page

**Files:**
- Create: `src/app/(app)/leagues/[slug]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LeaguePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth();
	if (!session?.user?.id) return null;

	const league = await prisma.league.findUnique({
		where: { slug },
		include: {
			members: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							image: true,
							predictions: {
								where: { points: { not: null } },
								select: { points: true },
							},
						},
					},
				},
			},
		},
	});

	if (!league) notFound();

	const ranked = league.members
		.map(({ user }) => ({
			id: user.id,
			name: user.name ?? "Anonymous",
			image: user.image,
			totalPoints: user.predictions.reduce((sum, p) => sum + (p.points ?? 0), 0),
			predictionsScored: user.predictions.length,
		}))
		.sort(
			(a, b) =>
				b.totalPoints - a.totalPoints ||
				b.predictionsScored - a.predictionsScored,
		);

	const h = await headers();
	const host = h.get("host") ?? "";
	const proto = h.get("x-forwarded-proto") ?? "https";
	const joinUrl = `${proto}://${host}/leagues/join/${slug}`;

	const medals = ["🥇", "🥈", "🥉"];

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">{league.name}</h1>
				<p className="text-sm text-foreground-muted">
					{ranked.length} member{ranked.length !== 1 ? "s" : ""}
				</p>
			</div>

			{/* Join link */}
			<div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
				<span className="flex-1 truncate font-mono text-sm text-foreground-muted">
					{joinUrl}
				</span>
				<CopyButton text={joinUrl} />
			</div>

			{/* Leaderboard */}
			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{ranked.length === 0 ? (
					<p className="px-6 py-12 text-center text-foreground-muted">
						No members yet.
					</p>
				) : (
					<ol>
						{ranked.map((player, i) => {
							const isCurrentUser = player.id === session.user.id;
							return (
								<li
									key={player.id}
									className={`flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 transition-colors ${isCurrentUser ? "bg-accent/10" : "hover:bg-surface-2"}`}
								>
									<span className="w-8 text-center text-lg">
										{medals[i] ?? (
											<span className="text-sm text-foreground-muted">
												{i + 1}
											</span>
										)}
									</span>

									{player.image ? (
										<Image
											src={player.image}
											alt={player.name}
											width={36}
											height={36}
											className="rounded-full"
										/>
									) : (
										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
											{player.name[0]?.toUpperCase()}
										</div>
									)}

									<div className="flex-1">
										<div className="flex items-center gap-2 font-semibold">
											{player.name}
											{isCurrentUser && (
												<span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
													you
												</span>
											)}
										</div>
										<div className="text-xs text-foreground-muted">
											{player.predictionsScored} result
											{player.predictionsScored !== 1 ? "s" : ""} scored
										</div>
									</div>

									<div
										className={`text-xl font-bold tabular-nums ${i === 0 ? "text-gold" : i < 3 ? "text-accent" : "text-foreground"}`}
									>
										{player.totalPoints}
										<span className="ml-1 text-sm font-normal text-foreground-muted">
											pts
										</span>
									</div>
								</li>
							);
						})}
					</ol>
				)}
			</div>

			<p className="text-center text-xs text-foreground-muted">
				Points: 3 exact score · 2 goal difference · 1 correct winner
			</p>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/leagues/[slug]/page.tsx
git commit -m "feat: add league leaderboard page"
```

---

### Task 10: Create the join-league confirmation page

**Files:**
- Create: `src/app/(app)/leagues/join/[slug]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { joinLeague } from "@/actions/leagues";

export default async function JoinLeaguePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth();
	if (!session?.user?.id) return null;

	const league = await prisma.league.findUnique({
		where: { slug },
		include: { _count: { select: { members: true } } },
	});

	if (!league) {
		return (
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
				<h1 className="text-2xl font-bold">League not found</h1>
				<p className="text-foreground-muted">
					This invite link is invalid or has been removed.
				</p>
			</div>
		);
	}

	const existing = await prisma.leagueMember.findUnique({
		where: {
			leagueId_userId: { leagueId: league.id, userId: session.user.id },
		},
	});

	if (existing) redirect(`/leagues/${slug}`);

	async function handleJoin() {
		"use server";
		await joinLeague(slug);
		redirect(`/leagues/${slug}`);
	}

	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-2xl font-bold">Join {league.name}</h1>
				<p className="text-sm text-foreground-muted">
					{league._count.members} member
					{league._count.members !== 1 ? "s" : ""} · compete on this leaderboard
				</p>
			</div>

			<form action={handleJoin}>
				<button
					type="submit"
					className="rounded-xl bg-accent px-8 py-3 font-semibold text-white"
				>
					Join league
				</button>
			</form>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/leagues/join/[slug]/page.tsx
git commit -m "feat: add join-league confirmation page"
```

---

### Task 11: Add Leagues to the Navbar

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add the Leagues link**

After the `<Link href="/leaderboard">` block (line 32–36), add:

```tsx
<Link
  href="/leagues"
  className="rounded-lg px-3 py-1.5 text-foreground-muted hover:bg-surface-2 hover:text-foreground transition-colors"
>
  Leagues
</Link>
```

- [ ] **Step 2: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: add Leagues link to navbar"
```

---

### Task 12: Create the default-league seed script

**Files:**
- Create: `scripts/seed-default-league.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the script**

```ts
import { prisma } from "../src/lib/db";

async function main() {
	const adminEmail = process.env.ADMIN_EMAIL;
	if (!adminEmail) {
		console.error("ADMIN_EMAIL env var is not set.");
		process.exit(1);
	}

	const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
	if (!admin) {
		console.error(
			`No user found with email "${adminEmail}". Sign in first, then re-run this script.`,
		);
		process.exit(1);
	}

	const league = await prisma.league.upsert({
		where: { slug: "global" },
		create: { name: "Global", slug: "global", createdBy: admin.id },
		update: {},
	});

	const users = await prisma.user.findMany({ select: { id: true } });

	await prisma.leagueMember.createMany({
		data: users.map((u) => ({ leagueId: league.id, userId: u.id })),
		skipDuplicates: true,
	});

	console.log(
		`Done. Added ${users.length} user(s) to "${league.name}" (slug: ${league.slug}).`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add the script to `package.json`**

In the `"scripts"` block of `package.json`, add after `"db:sync"`:

```json
"db:seed-leagues": "tsx scripts/seed-default-league.ts",
```

- [ ] **Step 3: Verify**

```bash
bun lint && bun build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-default-league.ts package.json
git commit -m "feat: add seed-default-league migration script"
```

---

## Post-implementation checklist

After all tasks are complete:

- [ ] Run `bun db:seed-leagues` once (with `ADMIN_EMAIL` set) to migrate existing users into the Global league
- [ ] Smoke-test the full flow:
  1. Leaderboard rows are clickable — current user goes to `/my-predictions`, others to `/players/[id]`
  2. Head-to-head page shows predictions hidden as "?" for unfinished matches
  3. Finished match detail page shows the prediction feed with avatars and "(you)" badge
  4. `/leagues` shows your leagues; "+ Create" works and redirects to the new league
  5. Shareable join link opens confirmation screen and joins correctly; second visit redirects to league page
  6. Global league appears for all existing users after running the seed script
