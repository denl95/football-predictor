import { BracketTree } from "@/components/BracketTree";
import { auth } from "@/lib/auth";
import { STAGE_LABEL, STAGE_POINTS } from "@/lib/bracket";
import { prisma } from "@/lib/db";

export default async function BracketPage() {
	const session = await auth();

	// All knockout matches sorted by date
	const knockoutMatches = await prisma.match.findMany({
		where: { stage: { not: "GROUP" } },
		orderBy: { scheduledAt: "asc" },
	});

	const r32 = knockoutMatches.filter((m) => m.stage === "ROUND_OF_32");
	const r16 = knockoutMatches.filter((m) => m.stage === "ROUND_OF_16");
	const qf = knockoutMatches.filter((m) => m.stage === "QUARTER_FINAL");
	const sf = knockoutMatches.filter((m) => m.stage === "SEMI_FINAL");
	const finalMatch = knockoutMatches.find((m) => m.stage === "FINAL") ?? null;

	// User's existing picks
	const rawPicks = session?.user?.id
		? await prisma.bracketMatchPick.findMany({
				where: { userId: session.user.id },
			})
		: [];

	const initialPicks: Record<string, string> = {};
	for (const p of rawPicks) initialPicks[p.matchId] = p.predictedWinner;

	// Lock state — bracket locks when the first match of the tournament starts.
	const firstMatch = await prisma.match.findFirst({
		orderBy: { scheduledAt: "asc" },
		select: { scheduledAt: true, status: true },
	});
	const isLocked =
		!!firstMatch &&
		(firstMatch.status !== "UPCOMING" || firstMatch.scheduledAt <= new Date());

	// All WC teams from group stage
	const groupMatches = await prisma.match.findMany({
		where: { stage: "GROUP" },
		select: { homeTeam: true, awayTeam: true },
	});
	const teamSet = new Set<string>();
	for (const m of groupMatches) {
		teamSet.add(m.homeTeam);
		teamSet.add(m.awayTeam);
	}
	const allTeams = [...teamSet].sort((a, b) => a.localeCompare(b));

	const totalPoints = rawPicks.reduce((sum, p) => sum + (p.points ?? 0), 0);
	const hasPoints = rawPicks.some((p) => p.points !== null);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Tournament Bracket</h1>
				<p className="text-sm text-foreground-muted">
					Predict each team's path through the knockout rounds. Earn points for
					every round a team reaches — the exact path matters (group winner,
					runner-up, or eligible 3rd place per slot). Picks lock when the first
					tournament match kicks off.
				</p>
			</div>

			{hasPoints ? (
				<div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
					<span className="text-2xl font-bold text-gold tabular-nums">
						{totalPoints}
					</span>
					<span className="text-sm text-foreground-muted">
						bracket points earned
					</span>
				</div>
			) : null}

			{/* Scoring key */}
			<div className="flex flex-wrap gap-2">
				{(
					[
						"ROUND_OF_32",
						"ROUND_OF_16",
						"QUARTER_FINAL",
						"SEMI_FINAL",
						"FINAL",
						"CHAMPION",
					] as const
				).map((stage) => (
					<div
						key={stage}
						className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${stage === "CHAMPION" ? "border-gold/40 bg-gold/10" : "border-border bg-surface"}`}
					>
						<span className="text-foreground-muted">{STAGE_LABEL[stage]}</span>
						<span
							className={`font-semibold ${stage === "CHAMPION" ? "text-gold" : "text-accent"}`}
						>
							+{STAGE_POINTS[stage]}pts
						</span>
					</div>
				))}
			</div>

			<BracketTree
				r32={r32}
				r16={r16}
				qf={qf}
				sf={sf}
				finalMatch={finalMatch}
				initialPicks={initialPicks}
				allTeams={allTeams}
				isLocked={isLocked}
			/>
		</div>
	);
}
