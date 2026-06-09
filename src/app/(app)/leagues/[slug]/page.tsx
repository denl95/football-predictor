import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { LeaderboardChart } from "@/components/LeaderboardChart";
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
			totalPoints: user.predictions.reduce(
				(sum, p) => sum + (p.points ?? 0),
				0,
			),
			predictionsScored: user.predictions.length,
		}))
		.sort(
			(a, b) =>
				b.totalPoints - a.totalPoints ||
				b.predictionsScored - a.predictionsScored,
		);

	// Build chart data: cumulative points over time, scoped to league members
	const memberIds = league.members.map((m) => m.userId);
	const playerNames = ranked.map((u) => u.name);

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

			<LeaderboardChart data={chartData} players={playerNames} />

			{/* Leaderboard */}
			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{ranked.length === 0 ? (
					<p className="px-6 py-12 text-center text-foreground-muted">
						No members yet.
					</p>
				) : (
					<ol>
						{ranked.map((player, i) => {
							const isCurrentUser = player.id === userId;
							return (
								<li
									key={player.id}
									className={`border-b border-border last:border-b-0 transition-colors ${isCurrentUser ? "bg-accent/10" : "hover:bg-surface-2"}`}
								>
									<Link
										href={
											isCurrentUser
												? "/my-predictions"
												: `/players/${player.id}`
										}
										className="flex items-center gap-4 px-5 py-4"
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
									</Link>
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
