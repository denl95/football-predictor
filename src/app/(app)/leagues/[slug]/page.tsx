import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { LeagueLeaderboard } from "@/components/LeagueLeaderboard";
import { RenameLeagueForm } from "@/components/RenameLeagueForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
	memberPredictionStatus,
	windowMatchIds,
} from "@/lib/prediction-status";

export default async function LeaguePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth();
	if (!session?.user?.id) return null;
	const userId = session.user.id;

	const league = await prisma.league.findUnique({
		where: { slug },
		include: {
			members: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							predictions: {
								where: { points: { not: null } },
								select: { points: true },
							},
							bracketMatchPicks: {
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

	// Per-player point totals. Ranking/sorting happens client-side in
	// LeagueLeaderboard so the Scores/Bracket toggle can re-rank without a refetch.
	const players = league.members
		.map(({ user }) => ({
			id: user.id,
			name: user.name ?? "Anonymous",
			matchPoints: user.predictions.reduce(
				(sum, p) => sum + (p.points ?? 0),
				0,
			),
			bracketPoints: user.bracketMatchPicks.reduce(
				(sum, p) => sum + (p.points ?? 0),
				0,
			),
			predictionsScored: user.predictions.length,
		}))
		.sort(
			(a, b) =>
				b.matchPoints - a.matchPoints ||
				b.predictionsScored - a.predictionsScored,
		);

	// Build chart data: cumulative match points over time, scoped to league members
	const memberIds = league.members.map((m) => m.userId);
	const playerNames = players.map((u) => u.name);

	const windowIds = await windowMatchIds();
	const predictionStatus = await memberPredictionStatus(memberIds, windowIds);
	const hasPredictionWindow = windowIds.length > 0;

	const finishedPredictions = await prisma.prediction.findMany({
		where: {
			points: { not: null },
			match: { status: "FINISHED" },
			userId: { in: memberIds },
		},
		select: {
			points: true,
			user: { select: { name: true } },
			match: { select: { scheduledAt: true } },
		},
		orderBy: { match: { scheduledAt: "asc" } },
	});

	const cumulative: Record<string, number> = Object.fromEntries(
		playerNames.map((n) => [n, 0]),
	);
	type DataPoint = Record<string, number | string>;
	const byDate = new Map<string, DataPoint>();

	for (const p of finishedPredictions) {
		const date = p.match.scheduledAt.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
		});
		const name = p.user.name ?? "Anonymous";
		cumulative[name] = (cumulative[name] ?? 0) + (p.points ?? 0);

		const point = byDate.get(date);
		if (point) {
			point[name] = cumulative[name];
		} else {
			byDate.set(date, {
				date,
				...Object.fromEntries(playerNames.map((n) => [n, cumulative[n] ?? 0])),
			});
		}
	}

	const chartData = Array.from(byDate.values());

	const h = await headers();
	const host = h.get("host") ?? "";
	const proto = h.get("x-forwarded-proto") ?? "https";
	const joinUrl = `${proto}://${host}/leagues/join/${slug}`;

	const isCreator = league.createdBy === userId;

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold">{league.name}</h1>
					<p className="text-sm text-foreground-muted">
						{players.length} member{players.length !== 1 ? "s" : ""}
					</p>
				</div>
				{isCreator ? (
					<RenameLeagueForm slug={slug} currentName={league.name} />
				) : null}
			</div>

			{/* Join link */}
			<div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
				<span className="flex-1 truncate font-mono text-sm text-foreground-muted">
					{joinUrl}
				</span>
				<CopyButton text={joinUrl} />
			</div>

			<LeagueLeaderboard
				players={players}
				currentUserId={userId}
				creatorId={league.createdBy}
				isCreator={isCreator}
				slug={slug}
				predictionStatus={predictionStatus}
				hasPredictionWindow={hasPredictionWindow}
				lineData={chartData}
				playerNames={playerNames}
			/>
		</div>
	);
}
