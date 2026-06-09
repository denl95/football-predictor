"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BRACKET_STAGES, STAGE_LIMIT, STAGE_POINTS } from "@/lib/bracket";
import type { BracketStage } from "@/generated/prisma/client";

export type BracketActionResult =
	| { success: true }
	| { success: false; error: string };

async function isLocked(): Promise<boolean> {
	const match = await prisma.match.findFirst({
		where: { stage: { not: "GROUP" }, status: { not: "UPCOMING" } },
	});
	return !!match;
}

export async function saveBracketPicks(
	picks: Partial<Record<string, string[]>>,
): Promise<BracketActionResult> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	if (await isLocked()) {
		return { success: false, error: "Bracket is locked" };
	}

	for (const stage of BRACKET_STAGES) {
		const teams = picks[stage] ?? [];
		if (teams.length > STAGE_LIMIT[stage]) {
			return {
				success: false,
				error: `Too many picks for ${stage} (max ${STAGE_LIMIT[stage]})`,
			};
		}
	}

	const userId = session.user.id;

	await prisma.$transaction(async (tx) => {
		await tx.bracketPick.deleteMany({ where: { userId } });
		const rows = BRACKET_STAGES.flatMap((stage) =>
			(picks[stage] ?? []).map((team) => ({ userId, stage, team })),
		);
		if (rows.length > 0) {
			await tx.bracketPick.createMany({ data: rows });
		}
	});

	revalidatePath("/bracket");
	return { success: true };
}

// Called by admin once a knockout stage is complete with the actual qualified teams.
export async function finaliseBracketStage(
	stage: BracketStage,
	qualifiedTeams: string[],
): Promise<void> {
	const session = await auth();
	if (session?.user?.email !== process.env.ADMIN_EMAIL) {
		throw new Error("Forbidden");
	}

	const picks = await prisma.bracketPick.findMany({ where: { stage } });
	const qualifiedSet = new Set(qualifiedTeams);
	const pts = STAGE_POINTS[stage];

	await Promise.all(
		picks.map((p) =>
			prisma.bracketPick.update({
				where: { id: p.id },
				data: { points: qualifiedSet.has(p.team) ? pts : 0 },
			}),
		),
	);

	revalidatePath("/bracket");
}
