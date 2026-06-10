import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Flag } from "@/components/Flag";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMatchStarted } from "@/lib/match-lock";

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
		myPred: {
			userId: string;
			homeScore: number;
			awayScore: number;
			points: number | null;
		} | null;
		theirPred: {
			userId: string;
			homeScore: number;
			awayScore: number;
			points: number | null;
		} | null;
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
							const hasStarted = hasMatchStarted(match);
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
												{isFinished && <PointsBadge points={myPred.points} />}
											</>
										) : (
											<span className="text-xs text-foreground-muted">–</span>
										)}
									</div>

									{/* Match info */}
									<div className="flex flex-col items-center gap-0.5 text-center">
										<span className="text-xs font-medium">
											<Flag name={match.homeTeam} /> {match.homeTeam}
										</span>
										<span className="text-xs text-foreground-muted">vs</span>
										<span className="text-xs font-medium">
											<Flag name={match.awayTeam} /> {match.awayTeam}
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
													{hasStarted
														? `${theirPred.homeScore} – ${theirPred.awayScore}`
														: "?"}
												</span>
												{isFinished && (
													<PointsBadge points={theirPred.points} />
												)}
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
