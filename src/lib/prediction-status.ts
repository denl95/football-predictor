import { prisma } from "@/lib/db";

/** How far ahead a match counts as "needs predicting soon". */
export const WINDOW_HOURS = 48;

export type MemberStatus = "ready" | "pending";

/** IDs of matches that are UPCOMING and kick off within the next WINDOW_HOURS. */
export async function windowMatchIds(
	now: Date = new Date(),
): Promise<string[]> {
	const end = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
	const matches = await prisma.match.findMany({
		where: {
			status: "UPCOMING",
			scheduledAt: { gte: now, lte: end },
		},
		select: { id: true },
	});
	return matches.map((m) => m.id);
}

/** Number of window matches the user has NOT predicted yet (0 if none open). */
export async function countMissingPredictions(
	userId: string,
	now: Date = new Date(),
): Promise<number> {
	const ids = await windowMatchIds(now);
	if (ids.length === 0) return 0;
	const predicted = await prisma.prediction.count({
		where: { userId, matchId: { in: ids } },
	});
	return ids.length - predicted;
}

/**
 * Per-member prediction status for the given window matches: "ready" when the
 * member has predicted every window match, otherwise "pending". Returns an empty
 * map when there are no window matches or no members — callers should hide the
 * markers in that case. Only the existence of a prediction is read, never scores.
 */
export async function memberPredictionStatus(
	memberIds: string[],
	windowIds: string[],
): Promise<Record<string, MemberStatus>> {
	const status: Record<string, MemberStatus> = {};
	if (windowIds.length === 0 || memberIds.length === 0) return status;

	const rows = await prisma.prediction.findMany({
		where: { userId: { in: memberIds }, matchId: { in: windowIds } },
		select: { userId: true, matchId: true },
	});

	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.userId] = (counts[row.userId] ?? 0) + 1;

	for (const id of memberIds) {
		status[id] = (counts[id] ?? 0) >= windowIds.length ? "ready" : "pending";
	}
	return status;
}
