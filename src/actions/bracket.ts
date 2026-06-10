"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { STAGE_POINTS } from "@/lib/bracket";
import { prisma } from "@/lib/db";

export type BracketActionResult =
	| { success: true }
	| { success: false; error: string };

async function isBracketLocked(): Promise<boolean> {
	const match = await prisma.match.findFirst({
		where: { stage: { not: "GROUP" }, status: { not: "UPCOMING" } },
	});
	return !!match;
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

	await Promise.all(
		pickList.map((p) => {
			let earned = p.predictedWinner === winner ? pts : 0;
			// Final: both finalists earn FINAL pts; champion picker earns an extra CHAMPION pts.
			if (match.stage === "FINAL") {
				earned =
					(STAGE_POINTS.FINAL ?? 0) +
					(p.predictedWinner === winner ? (STAGE_POINTS.CHAMPION ?? 0) : 0);
			}
			return prisma.bracketMatchPick.update({
				where: { id: p.id },
				data: { points: earned },
			});
		}),
	);

	revalidatePath("/bracket");
}
