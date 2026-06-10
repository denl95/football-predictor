"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMatchStarted } from "@/lib/match-lock";
import { calculatePoints } from "@/lib/points";

const PredictionSchema = z.object({
	matchId: z.string().min(1),
	homeScore: z.number().int().min(0).max(20),
	awayScore: z.number().int().min(0).max(20),
});

export type PredictionState =
	| { success: true }
	| { success: false; error: string };

export async function upsertPrediction(
	_prev: PredictionState | null,
	formData: FormData,
): Promise<PredictionState> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	const parsed = PredictionSchema.safeParse({
		matchId: formData.get("matchId"),
		homeScore: Number(formData.get("homeScore")),
		awayScore: Number(formData.get("awayScore")),
	});

	if (!parsed.success) {
		return { success: false, error: "Invalid scores" };
	}

	const { matchId, homeScore, awayScore } = parsed.data;

	const match = await prisma.match.findUnique({ where: { id: matchId } });
	if (!match) return { success: false, error: "Match not found" };
	if (hasMatchStarted(match)) {
		return { success: false, error: "Cannot predict a match that has started" };
	}

	await prisma.prediction.upsert({
		where: { userId_matchId: { userId: session.user.id, matchId } },
		create: { userId: session.user.id, matchId, homeScore, awayScore },
		update: { homeScore, awayScore },
	});

	revalidatePath(`/matches/${matchId}`);
	revalidatePath("/my-predictions");
	return { success: true };
}

export async function finaliseMatch(
	matchId: string,
	homeScore: number,
	awayScore: number,
): Promise<void> {
	const session = await auth();
	if (session?.user?.email !== process.env.ADMIN_EMAIL) {
		throw new Error("Forbidden");
	}

	await prisma.match.update({
		where: { id: matchId },
		data: { homeScore, awayScore, status: "FINISHED" },
	});

	const predictions = await prisma.prediction.findMany({
		where: { matchId },
	});

	for (const p of predictions) {
		const points = calculatePoints(
			p.homeScore,
			p.awayScore,
			homeScore,
			awayScore,
		);
		await prisma.prediction.update({
			where: { id: p.id },
			data: { points },
		});
	}

	revalidatePath(`/matches/${matchId}`);
	revalidatePath("/leaderboard");
	revalidatePath("/my-predictions");
}
