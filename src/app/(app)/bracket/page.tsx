import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BRACKET_STAGES, STAGE_POINTS } from "@/lib/bracket";
import { BracketPicker } from "@/components/BracketPicker";
import type { BracketStage } from "@/generated/prisma/client";

export default async function BracketPage() {
	const session = await auth();

	// Collect all 48 WC teams from group stage matches
	const matches = await prisma.match.findMany({
		where: { stage: "GROUP" },
		select: { homeTeam: true, awayTeam: true },
	});
	const teamSet = new Set<string>();
	for (const m of matches) {
		teamSet.add(m.homeTeam);
		teamSet.add(m.awayTeam);
	}
	const allTeams = [...teamSet].sort();

	// User's existing picks
	const rawPicks = session?.user?.id
		? await prisma.bracketPick.findMany({
				where: { userId: session.user.id },
			})
		: [];

	const picksByStage: Partial<Record<BracketStage, string[]>> = {};
	for (const p of rawPicks) {
		(picksByStage[p.stage] ??= []).push(p.team);
	}

	// Bracket locks once any non-group match is no longer UPCOMING
	const lockedMatch = await prisma.match.findFirst({
		where: { stage: { not: "GROUP" }, status: { not: "UPCOMING" } },
	});
	const isLocked = !!lockedMatch;

	// Total bracket points earned so far
	const totalPoints = rawPicks.reduce((sum, p) => sum + (p.points ?? 0), 0);
	const hasPoints = rawPicks.some((p) => p.points !== null);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Tournament Bracket</h1>
				<p className="text-sm text-foreground-muted">
					Pick which teams advance through each knockout round. Picks lock when
					the first knockout match kicks off.
				</p>
			</div>

			{/* Points earned */}
			{hasPoints && (
				<div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
					<span className="text-2xl font-bold text-gold tabular-nums">
						{totalPoints}
					</span>
					<span className="text-sm text-foreground-muted">
						bracket points earned
					</span>
				</div>
			)}

			{/* Scoring key */}
			<div className="flex flex-wrap gap-2">
				{BRACKET_STAGES.map((stage) => (
					<div
						key={stage}
						className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs"
					>
						<span className="text-foreground-muted">
							{stage === "ROUND_OF_32"
								? "R32"
								: stage === "ROUND_OF_16"
									? "R16"
									: stage === "QUARTER_FINAL"
										? "QF"
										: stage === "SEMI_FINAL"
											? "SF"
											: stage === "FINAL"
												? "Final"
												: "🏆"}
						</span>
						<span className="font-semibold text-accent">
							+{STAGE_POINTS[stage]}pt
							{STAGE_POINTS[stage] !== 1 ? "s" : ""}
						</span>
					</div>
				))}
			</div>

			<BracketPicker
				allTeams={allTeams}
				initialPicks={picksByStage as Record<string, string[]>}
				isLocked={isLocked}
			/>
		</div>
	);
}
