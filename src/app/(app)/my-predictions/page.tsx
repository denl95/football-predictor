import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toFlag } from "@/lib/football-data";

export default async function MyPredictionsPage() {
	const session = await auth();
	if (!session?.user?.id) return null;

	const predictions = await prisma.prediction.findMany({
		where: { userId: session.user.id },
		include: { match: true },
		orderBy: { match: { scheduledAt: "asc" } },
	});

	const scored = predictions.filter((p) => p.points !== null);
	const totalPoints = scored.reduce((sum, p) => sum + (p.points ?? 0), 0);

	const exactScore = scored.filter((p) => p.points === 3).length;
	const goalDiff = scored.filter((p) => p.points === 2).length;
	const winner = scored.filter((p) => p.points === 1).length;
	const wrong = scored.filter((p) => p.points === 0).length;

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">My Predictions</h1>
				<p className="text-sm text-foreground-muted">
					{predictions.length} prediction{predictions.length !== 1 ? "s" : ""} ·{" "}
					{scored.length} scored
				</p>
			</div>

			{/* Stats */}
			{scored.length > 0 && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{
							label: "Total pts",
							value: totalPoints,
							color: "text-foreground",
						},
						{ label: "Exact score", value: exactScore, color: "text-gold" },
						{ label: "Goal diff", value: goalDiff, color: "text-accent" },
						{ label: "Winner", value: winner, color: "text-blue-400" },
					].map((stat) => (
						<div
							key={stat.label}
							className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3"
						>
							<span className={`text-2xl font-bold tabular-nums ${stat.color}`}>
								{stat.value}
							</span>
							<span className="text-xs text-foreground-muted">
								{stat.label}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Prediction list */}
			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{predictions.length === 0 ? (
					<div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
						<p className="text-foreground-muted">No predictions yet.</p>
						<Link
							href="/matches"
							className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white"
						>
							Browse matches
						</Link>
					</div>
				) : (
					<ul>
						{predictions.map((p) => {
							const isFinished = p.match.status === "FINISHED";
							return (
								<li
									key={p.id}
									className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
								>
									<Link
										href={`/matches/${p.match.id}`}
										className="flex flex-1 items-center gap-3 hover:opacity-80 transition-opacity"
									>
										<div className="flex flex-1 flex-col gap-0.5">
											<div className="flex items-center gap-2 text-sm font-semibold">
												<span>{toFlag(p.match.homeTeam)}</span>
												<span>{p.match.homeTeam}</span>
												<span className="text-foreground-muted">vs</span>
												<span>{p.match.awayTeam}</span>
												<span>{toFlag(p.match.awayTeam)}</span>
											</div>
											<div className="text-xs text-foreground-muted">
												{p.match.group} ·{" "}
												{new Date(p.match.scheduledAt).toLocaleDateString(
													"en-GB",
													{
														day: "numeric",
														month: "short",
													},
												)}
											</div>
										</div>

										<div className="flex items-center gap-3 text-sm tabular-nums">
											<span className="font-bold">
												{p.homeScore} – {p.awayScore}
											</span>

											{isFinished && p.match.homeScore !== null && (
												<span className="text-foreground-muted">
													({p.match.homeScore} – {p.match.awayScore})
												</span>
											)}

											{p.points !== null ? (
												<span
													className={`w-12 rounded-lg px-2 py-0.5 text-center font-bold ${p.points === 3 ? "bg-gold/20 text-gold" : p.points >= 1 ? "bg-accent/20 text-accent" : "bg-red-500/20 text-red-400"}`}
												>
													{p.points} pts
												</span>
											) : (
												<span className="w-12 rounded-lg bg-surface-2 px-2 py-0.5 text-center text-xs text-foreground-muted">
													{p.match.status === "UPCOMING" ? "–" : "TBD"}
												</span>
											)}
										</div>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{wrong > 0 && (
				<p className="text-center text-xs text-foreground-muted">
					{wrong} missed prediction{wrong !== 1 ? "s" : ""}
				</p>
			)}
		</div>
	);
}
