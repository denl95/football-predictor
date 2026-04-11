import { notFound } from "next/navigation";
import { PredictionForm } from "@/components/PredictionForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

	const allPredictions = await prisma.prediction.findMany({
		where: { matchId: id, points: { not: null } },
		include: { user: { select: { name: true, image: true } } },
		orderBy: { points: "desc" },
		take: 10,
	});

	const isFinished = match.status === "FINISHED";
	const canPredict = match.status === "UPCOMING";

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
					<div className="flex flex-1 flex-col items-center gap-2">
						<span className="text-5xl">{match.homeFlag}</span>
						<span className="text-center font-semibold">{match.homeTeam}</span>
					</div>

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

					<div className="flex flex-1 flex-col items-center gap-2">
						<span className="text-5xl">{match.awayFlag}</span>
						<span className="text-center font-semibold">{match.awayTeam}</span>
					</div>
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
				<div className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
						Top predictions
					</h2>
					<ol className="flex flex-col gap-2">
						{allPredictions.map((p, i) => (
							<li
								key={p.id}
								className="flex items-center justify-between text-sm"
							>
								<span className="flex items-center gap-2">
									<span className="w-5 text-foreground-muted">{i + 1}.</span>
									<span>{p.user.name ?? "Anonymous"}</span>
								</span>
								<span className="flex items-center gap-3">
									<span className="tabular-nums text-foreground-muted">
										{p.homeScore} – {p.awayScore}
									</span>
									<span
										className={`font-bold ${p.points === 3 ? "text-gold" : (p.points ?? 0) >= 1 ? "text-accent" : "text-red-400"}`}
									>
										{p.points} pts
									</span>
								</span>
							</li>
						))}
					</ol>
				</div>
			)}
		</div>
	);
}
