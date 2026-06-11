"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { STAGE_POINTS } from "@/lib/bracket";
import { prisma } from "@/lib/db";

export type BracketActionResult =
	| { success: true }
	| { success: false; error: string };

async function isBracketLocked(): Promise<boolean> {
	// Bracket locks when the first match of the tournament kicks off (not just
	// the first knockout match), so picks can't be adjusted once any game starts.
	const first = await prisma.match.findFirst({
		orderBy: { scheduledAt: "asc" },
		select: { scheduledAt: true, status: true },
	});
	if (!first) return false;
	return first.status !== "UPCOMING" || first.scheduledAt <= new Date();
}

/** Upsert all bracket picks in one go (client sends full picks map). */
export async function saveBracketPicks(
	picks: Record<string, string>,
): Promise<BracketActionResult> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };
	if (await isBracketLocked())
		return { success: false, error: "Bracket is locked" };

	const userId = session.user.id;

	await prisma.$transaction(async (tx) => {
		await tx.bracketMatchPick.deleteMany({ where: { userId } });
		const rows = Object.entries(picks).map(([matchId, predictedWinner]) => ({
			userId,
			matchId,
			predictedWinner,
		}));
		if (rows.length > 0) await tx.bracketMatchPick.createMany({ data: rows });
	});

	revalidatePath("/bracket");
	return { success: true };
}

/** Admin: score picks for a completed knockout match. */
export async function finaliseBracketMatch(
	matchId: string,
	winner: string,
): Promise<void> {
	const session = await auth();
	if (session?.user?.email !== process.env.ADMIN_EMAIL)
		throw new Error("Forbidden");

	const match = await prisma.match.findUnique({ where: { id: matchId } });
	if (!match) throw new Error("Match not found");

	const pts = STAGE_POINTS[match.stage] ?? 0;
	const pickList = await prisma.bracketMatchPick.findMany({
		where: { matchId },
	});

	// Points are awarded when the predicted team REACHES a round, not only if they
	// win it. Reaching a round means playing in it — i.e. the team is one of the
	// two participants in this specific match slot. The group-position path must be
	// exact: if a user predicted Germany for the "Group E Winner" slot but Germany
	// came second, Germany won't be in that match and earns 0.
	//
	// The Final is special: reaching it (being either finalist) earns FINAL pts,
	// and winning it earns an additional CHAMPION pts on top.
	await Promise.all(
		pickList.map((p) => {
			let earned = 0;
			if (match.stage === "FINAL") {
				// Both finalists earn FINAL pts; champion earns an additional CHAMPION pts.
				earned =
					(STAGE_POINTS.FINAL ?? 0) +
					(p.predictedWinner === winner ? (STAGE_POINTS.CHAMPION ?? 0) : 0);
			} else {
				// Earn pts for any pick whose team actually played in this match.
				const reached =
					p.predictedWinner === match.homeTeam ||
					p.predictedWinner === match.awayTeam;
				earned = reached ? pts : 0;
			}
			return prisma.bracketMatchPick.update({
				where: { id: p.id },
				data: { points: earned },
			});
		}),
	);

	revalidatePath("/bracket");
}
