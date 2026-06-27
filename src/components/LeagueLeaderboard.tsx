"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
	type BarEntry,
	LeaderboardChart,
	PointsBarChart,
} from "@/components/LeaderboardChart";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";

type Player = {
	id: string;
	name: string;
	matchPoints: number;
	bracketPoints: number;
	predictionsScored: number;
};

type Mode = "scores" | "bracket";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeagueLeaderboard({
	players,
	currentUserId,
	creatorId,
	isCreator,
	slug,
	predictionStatus,
	hasPredictionWindow,
	lineData,
	playerNames,
}: Readonly<{
	players: Player[];
	currentUserId: string;
	creatorId: string;
	isCreator: boolean;
	slug: string;
	predictionStatus: Record<string, string>;
	hasPredictionWindow: boolean;
	lineData: Record<string, number | string>[];
	playerNames: string[];
}>) {
	const [mode, setMode] = useState<Mode>("scores");
	const metric = (p: Player) =>
		mode === "scores" ? p.matchPoints : p.bracketPoints;

	const ranked = useMemo(
		() =>
			[...players].sort(
				(a, b) =>
					(mode === "scores" ? b.matchPoints : b.bracketPoints) -
						(mode === "scores" ? a.matchPoints : a.bracketPoints) ||
					b.predictionsScored - a.predictionsScored,
			),
		[players, mode],
	);

	const barData: BarEntry[] = ranked.map((u) => ({
		name: u.name,
		points: metric(u),
	}));

	return (
		<div className="flex flex-col gap-6">
			{/* Scores / Bracket toggle */}
			<div className="flex w-fit overflow-hidden rounded-xl border border-border">
				<button
					type="button"
					onClick={() => setMode("scores")}
					className={`px-4 py-2 text-sm font-medium transition-colors ${
						mode === "scores"
							? "bg-surface-2 text-foreground"
							: "text-foreground-muted hover:text-foreground"
					}`}
				>
					Match scores
				</button>
				<button
					type="button"
					onClick={() => setMode("bracket")}
					className={`px-4 py-2 text-sm font-medium transition-colors ${
						mode === "bracket"
							? "bg-surface-2 text-foreground"
							: "text-foreground-muted hover:text-foreground"
					}`}
				>
					Bracket
				</button>
			</div>

			<PointsBarChart data={barData} />

			{mode === "scores" ? (
				<LeaderboardChart data={lineData} players={playerNames} />
			) : null}

			{/* Leaderboard */}
			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{ranked.length === 0 ? (
					<p className="px-6 py-12 text-center text-foreground-muted">
						No members yet.
					</p>
				) : (
					<ol>
						{ranked.map((player, i) => {
							const isCurrentUser = player.id === currentUserId;
							const canRemove = isCreator && player.id !== creatorId;
							const rankColor =
								i === 0
									? "text-gold"
									: i < 3
										? "text-accent"
										: "text-foreground";
							return (
								<li
									key={player.id}
									className={`flex items-center border-b border-border last:border-b-0 transition-colors ${isCurrentUser ? "bg-accent/10" : "hover:bg-surface-2"}`}
								>
									<Link
										href={
											isCurrentUser
												? "/my-predictions"
												: `/players/${player.id}`
										}
										className="flex flex-1 items-center gap-4 px-5 py-4"
									>
										<span className="w-8 text-center text-lg">
											{MEDALS[i] ?? (
												<span className="text-sm text-foreground-muted">
													{i + 1}
												</span>
											)}
										</span>

										<div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
											{player.name[0]?.toUpperCase()}
										</div>

										<div className="flex-1">
											<div className="flex items-center gap-2 font-semibold">
												{player.name}
												{isCurrentUser && (
													<span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
														you
													</span>
												)}
											</div>
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
										</div>

										<div
											className={`text-xl font-bold tabular-nums ${rankColor}`}
										>
											{metric(player)}
											<span className="ml-1 text-sm font-normal text-foreground-muted">
												pts
											</span>
										</div>
									</Link>
									{canRemove ? (
										<RemoveMemberButton
											slug={slug}
											userId={player.id}
											userName={player.name}
										/>
									) : null}
								</li>
							);
						})}
					</ol>
				)}
			</div>

			<p className="text-center text-xs text-foreground-muted">
				{mode === "scores"
					? "Match points: 3 exact score · 2 goal difference · 1 correct winner"
					: "Bracket points: a team scores each round it reaches — R32 +1, R16 +2, QF +3, SF +5, Final +8, Champion +12"}
			</p>
		</div>
	);
}
