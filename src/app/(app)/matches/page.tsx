import Link from "next/link";
import type { Match, Prediction } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type MatchWithPrediction = Match & { prediction?: Prediction | null };

function getStatusBadge(status: Match["status"]) {
	if (status === "LIVE")
		return (
			<span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
				LIVE
			</span>
		);
	if (status === "FINISHED")
		return (
			<span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-foreground-muted">
				FT
			</span>
		);
	return null;
}

function MatchCard({ match }: { match: MatchWithPrediction }) {
	const pred = match.prediction;
	const isFinished = match.status === "FINISHED";

	return (
		<Link
			href={`/matches/${match.id}`}
			className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
		>
			<div className="flex items-center justify-between text-xs text-foreground-muted">
				<span>{match.group}</span>
				<div className="flex items-center gap-2">
					{getStatusBadge(match.status)}
					<span>
						{new Date(match.scheduledAt).toLocaleDateString("en-GB", {
							day: "numeric",
							month: "short",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-2">
					<span className="text-2xl">{match.homeFlag}</span>
					<span className="font-semibold">{match.homeTeam}</span>
				</div>

				<div className="flex flex-col items-center gap-1">
					{isFinished ? (
						<div className="rounded-lg bg-surface-2 px-4 py-1 text-xl font-bold tabular-nums">
							{match.homeScore} – {match.awayScore}
						</div>
					) : (
						<div className="rounded-lg border border-border px-4 py-1 text-sm font-medium text-foreground-muted">
							vs
						</div>
					)}
				</div>

				<div className="flex flex-1 items-center justify-end gap-2">
					<span className="font-semibold">{match.awayTeam}</span>
					<span className="text-2xl">{match.awayFlag}</span>
				</div>
			</div>

			{pred && (
				<div className="flex items-center justify-between border-t border-border pt-2 text-xs">
					<span className="text-foreground-muted">
						Your prediction:{" "}
						<span className="font-semibold text-foreground">
							{pred.homeScore} – {pred.awayScore}
						</span>
					</span>
					{pred.points !== null && pred.points !== undefined && (
						<span
							className={`font-bold ${pred.points === 3 ? "text-gold" : pred.points >= 1 ? "text-accent" : "text-red-400"}`}
						>
							{pred.points} pts
						</span>
					)}
				</div>
			)}

			{!pred && match.status === "UPCOMING" && (
				<div className="border-t border-border pt-2 text-xs text-accent">
					+ Add prediction
				</div>
			)}
		</Link>
	);
}

export default async function MatchesPage() {
	const session = await auth();

	const matches = await prisma.match.findMany({
		orderBy: { scheduledAt: "asc" },
		include: {
			predictions: session?.user?.id
				? { where: { userId: session.user.id } }
				: false,
		},
	});

	const matchesWithPred: MatchWithPrediction[] = matches.map((m) => ({
		...m,
		prediction: Array.isArray(m.predictions)
			? (m.predictions[0] ?? null)
			: null,
	}));

	// Group by stage / group label
	const grouped = matchesWithPred.reduce<Record<string, MatchWithPrediction[]>>(
		(acc, m) => {
			const key = m.group ?? m.stage;
			(acc[key] ??= []).push(m);
			return acc;
		},
		{},
	);

	const predictedCount = matchesWithPred.filter((m) => m.prediction).length;
	const totalUpcoming = matchesWithPred.filter(
		(m) => m.status === "UPCOMING",
	).length;

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Matches</h1>
				<p className="text-sm text-foreground-muted">
					{predictedCount} / {totalUpcoming} upcoming matches predicted
				</p>
			</div>

			{Object.entries(grouped).map(([group, groupMatches]) => (
				<section key={group} className="flex flex-col gap-3">
					<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
						{group}
					</h2>
					<div className="grid gap-3 sm:grid-cols-2">
						{groupMatches.map((m) => (
							<MatchCard key={m.id} match={m} />
						))}
					</div>
				</section>
			))}
		</div>
	);
}
