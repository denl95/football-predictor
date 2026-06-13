import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/Flag";
import { LocalDateTime } from "@/components/LocalDateTime";
import { PredictionForm } from "@/components/PredictionForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMatchStarted } from "@/lib/match-lock";

const MATCH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
	weekday: "short",
	day: "numeric",
	month: "long",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	timeZoneName: "short",
};

export default async function MatchPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const session = await auth();

	const match = await prisma.match.findUnique({ where: { id } });
	if (!match) notFound();

	const prediction = session?.user?.id
		? await prisma.prediction.findUnique({
				where: { userId_matchId: { userId: session.user.id, matchId: id } },
			})
		: null;

	const isFinished = match.status === "FINISHED";
	const hasStarted = hasMatchStarted(match);
	const isLive = hasStarted && match.status !== "FINISHED";
	const canPredict = !hasStarted;
	const showScore =
		(isFinished || hasStarted) &&
		match.homeScore !== null &&
		match.awayScore !== null;

	// Once a match has kicked off, fetch predictions grouped by shared league.
	// We load the viewer's leagues, then for each league load its members'
	// predictions for this match.
	type LeaguePrediction = {
		userId: string;
		name: string;
		homeScore: number;
		awayScore: number;
		points: number | null;
	};
	type LeagueGroup = {
		leagueId: string;
		leagueName: string;
		predictions: LeaguePrediction[];
	};

	const leagueGroups: LeagueGroup[] = [];

	if (hasStarted && session?.user?.id) {
		const myLeagues = await prisma.league.findMany({
			where: { members: { some: { userId: session.user.id } } },
			select: {
				id: true,
				name: true,
				members: { select: { userId: true } },
			},
			orderBy: { name: "asc" },
		});

		for (const league of myLeagues) {
			const memberIds = league.members.map((m) => m.userId);
			// Exclude the current user — their prediction is shown separately above.
			const otherMemberIds = memberIds.filter((mid) => mid !== session.user.id);
			const preds = await prisma.prediction.findMany({
				where: { matchId: id, userId: { in: otherMemberIds } },
				include: { user: { select: { id: true, name: true } } },
				orderBy: [
					{ points: { sort: "desc", nulls: "last" } },
					{ createdAt: "asc" },
				],
			});
			if (preds.length > 0) {
				leagueGroups.push({
					leagueId: league.id,
					leagueName: league.name,
					predictions: preds.map((p) => ({
						userId: p.user.id,
						name: p.user.name ?? "Anonymous",
						homeScore: p.homeScore,
						awayScore: p.awayScore,
						points: p.points,
					})),
				});
			}
		}
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-6">
			{/* Match header */}
			<div className="rounded-2xl border border-border bg-surface p-6">
				<div className="mb-4 flex items-center justify-between text-xs text-foreground-muted">
					<span>{match.group}</span>
					<LocalDateTime
						iso={match.scheduledAt.toISOString()}
						fallback={match.scheduledAt.toLocaleString(
							"en-GB",
							MATCH_TIME_OPTIONS,
						)}
						options={MATCH_TIME_OPTIONS}
					/>
				</div>

				<div className="flex items-center justify-between gap-4">
					<Link
						href={`/teams/${encodeURIComponent(match.homeTeam)}`}
						className="flex flex-1 flex-col items-center gap-2 hover:text-accent transition-colors"
					>
						<Flag name={match.homeTeam} />
						<span className="text-center font-semibold">{match.homeTeam}</span>
					</Link>

					<div className="flex flex-col items-center gap-1">
						{showScore ? (
							<div
								className={`rounded-xl px-6 py-2 text-3xl font-bold tabular-nums ${isLive ? "bg-red-500/20 text-red-400" : "bg-surface-2"}`}
							>
								{match.homeScore} – {match.awayScore}
							</div>
						) : (
							<div className="rounded-xl border border-border px-6 py-2 text-lg font-medium text-foreground-muted">
								vs
							</div>
						)}
						{isLive && (
							<span className="text-xs font-semibold text-red-400">● LIVE</span>
						)}
					</div>

					<Link
						href={`/teams/${encodeURIComponent(match.awayTeam)}`}
						className="flex flex-1 flex-col items-center gap-2 hover:text-accent transition-colors"
					>
						<Flag name={match.awayTeam} />
						<span className="text-center font-semibold">{match.awayTeam}</span>
					</Link>
				</div>
			</div>

			{/* Prediction section */}
			{canPredict && (
				<div className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="mb-4 text-lg font-semibold">
						{prediction ? "Update prediction" : "Make a prediction"}
					</h2>
					<PredictionForm
						matchId={id}
						initialHome={prediction?.homeScore}
						initialAway={prediction?.awayScore}
					/>
				</div>
			)}

			{/* Own prediction — shown once here once match starts, excluded from league lists */}
			{hasStarted && prediction && (
				<div className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
						Your prediction
					</h2>
					<div className="flex items-center justify-between">
						<span className="text-xl font-bold tabular-nums">
							{prediction.homeScore} – {prediction.awayScore}
						</span>
						{prediction.points === null ? (
							<span className="text-sm text-foreground-muted">pending</span>
						) : (
							(() => {
								const ptColor =
									prediction.points === 3
										? "text-gold"
										: prediction.points >= 1
											? "text-accent"
											: "text-red-400";
								return (
									<span className={`text-lg font-bold ${ptColor}`}>
										{prediction.points} pt{prediction.points === 1 ? "" : "s"}
									</span>
								);
							})()
						)}
					</div>
				</div>
			)}

			{/* Predictions grouped by league */}
			{leagueGroups.map(({ leagueId, leagueName, predictions }) => (
				<div
					key={leagueId}
					className="overflow-hidden rounded-2xl border border-border bg-surface"
				>
					<div className="border-b border-border px-5 py-3">
						<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
							{leagueName}
						</h2>
					</div>
					<ul>
						{predictions.map((p) => {
							const isCurrentUser = p.userId === session?.user?.id;
							return (
								<li
									key={p.userId}
									className={`flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0 ${isCurrentUser ? "bg-accent/10" : ""}`}
								>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
										{p.name[0]?.toUpperCase()}
									</div>
									<span className="flex-1 text-sm font-semibold">
										{p.name}
										{isCurrentUser && (
											<span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
												you
											</span>
										)}
									</span>
									<span className="tabular-nums text-sm text-foreground-muted">
										{p.homeScore} – {p.awayScore}
									</span>
									{p.points !== null ? (
										<span
											className={`w-12 rounded-lg px-2 py-0.5 text-center text-sm font-bold ${p.points === 3 ? "bg-gold/20 text-gold" : p.points >= 1 ? "bg-accent/20 text-accent" : "bg-red-500/20 text-red-400"}`}
										>
											{p.points} pts
										</span>
									) : null}
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}
