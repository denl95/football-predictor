import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "@/components/Flag";
import { PredictionForm } from "@/components/PredictionForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMatchStarted } from "@/lib/match-lock";

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
	const canPredict = !hasStarted;

	// Once a match has kicked off, predictions are locked, so it's safe to reveal
	// everyone's picks (limited to leagues the viewer shares). Points only exist
	// after the match is finalised.
	const allPredictions =
		hasStarted && session?.user?.id
			? await prisma.prediction.findMany({
					where: {
						matchId: id,
						user: {
							leagueMemberships: {
								some: {
									league: {
										members: { some: { userId: session.user.id } },
									},
								},
							},
						},
					},
					include: {
						user: { select: { id: true, name: true, image: true } },
					},
					orderBy: [
						{ points: { sort: "desc", nulls: "last" } },
						{ createdAt: "asc" },
					],
				})
			: [];

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-6">
			{/* Match header */}
			<div className="rounded-2xl border border-border bg-surface p-6">
				<div className="mb-4 flex items-center justify-between text-xs text-foreground-muted">
					<span>{match.group}</span>
					<span>
						{new Date(match.scheduledAt).toLocaleDateString("en-GB", {
							weekday: "short",
							day: "numeric",
							month: "long",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
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
						{isFinished ? (
							<div className="rounded-xl bg-surface-2 px-6 py-2 text-3xl font-bold tabular-nums">
								{match.homeScore} – {match.awayScore}
							</div>
						) : (
							<div className="rounded-xl border border-border px-6 py-2 text-lg font-medium text-foreground-muted">
								vs
							</div>
						)}
						{match.status === "LIVE" && (
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

			{/* Own result when finished */}
			{isFinished && prediction && (
				<div className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
						Your prediction
					</h2>
					<div className="flex items-center justify-between">
						<span className="text-xl font-bold tabular-nums">
							{prediction.homeScore} – {prediction.awayScore}
						</span>
						{prediction.points !== null && (
							<span
								className={`text-lg font-bold ${prediction.points === 3 ? "text-gold" : prediction.points >= 1 ? "text-accent" : "text-red-400"}`}
							>
								{prediction.points} pt{prediction.points !== 1 ? "s" : ""}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Leaderboard for this match */}
			{allPredictions.length > 0 && (
				<div className="overflow-hidden rounded-2xl border border-border bg-surface">
					<div className="border-b border-border px-5 py-3">
						<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
							League predictions
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
			)}
		</div>
	);
}
