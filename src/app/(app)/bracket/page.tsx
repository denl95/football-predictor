import { getBracketLockAt } from "@/actions/bracket";
import { BracketPageClient } from "@/components/BracketPageClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function BracketPage() {
	const session = await auth();

	const knockoutMatches = await prisma.match.findMany({
		where: { stage: { not: "GROUP" } },
		orderBy: { scheduledAt: "asc" },
	});

	// Both brackets share the same kick-off order so they line up position-by-position
	// (each slot = the same match in both tabs, for a direct prediction-vs-reality
	// comparison). The prediction bracket keeps the order picks were made against.
	const r32 = knockoutMatches.filter((m) => m.stage === "ROUND_OF_32");
	const r16 = knockoutMatches.filter((m) => m.stage === "ROUND_OF_16");
	const qf = knockoutMatches.filter((m) => m.stage === "QUARTER_FINAL");
	const sf = knockoutMatches.filter((m) => m.stage === "SEMI_FINAL");

	const finalMatch = knockoutMatches.find((m) => m.stage === "FINAL") ?? null;

	const rawPicks = session?.user?.id
		? await prisma.bracketMatchPick.findMany({
				where: { userId: session.user.id },
			})
		: [];

	const initialPicks: Record<string, string> = {};
	const initialSlotPicks: Record<string, { home?: string; away?: string }> = {};
	for (const p of rawPicks) {
		if (p.predictedWinner) initialPicks[p.matchId] = p.predictedWinner;
		if (p.homeSlotTeam || p.awaySlotTeam) {
			initialSlotPicks[p.matchId] = {
				...(p.homeSlotTeam ? { home: p.homeSlotTeam } : {}),
				...(p.awaySlotTeam ? { away: p.awaySlotTeam } : {}),
			};
		}
	}

	const lockAt = await getBracketLockAt();
	const isLocked = !!lockAt && lockAt <= new Date();

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
					runner-up, or eligible 3rd place per slot). Picks lock when the
					knockout stage begins.
				</p>
			</div>

			<BracketPageClient
				r32={r32}
				r16={r16}
				qf={qf}
				sf={sf}
				finalMatch={finalMatch}
				initialPicks={initialPicks}
				initialSlotPicks={initialSlotPicks}
				allTeams={allTeams}
				isLocked={isLocked}
				totalPoints={totalPoints}
				hasPoints={hasPoints}
			/>
		</div>
	);
}
