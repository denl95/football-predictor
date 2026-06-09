import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
	fetchWCMatches,
	toGroupLabel,
	toStage,
	toStatus,
} from "@/lib/football-data";
import { calculatePoints } from "@/lib/points";

// pg requires Node.js runtime
export const runtime = "nodejs";

async function awardPoints(
	matchId: string,
	homeScore: number,
	awayScore: number,
) {
	const predictions = await prisma.prediction.findMany({ where: { matchId } });
	for (const p of predictions) {
		const points = calculatePoints(
			p.homeScore,
			p.awayScore,
			homeScore,
			awayScore,
		);
		await prisma.prediction.update({ where: { id: p.id }, data: { points } });
	}
}

export async function GET(request: NextRequest) {
	// Verify the request comes from Vercel Cron or an authorised caller
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const fdMatches = await fetchWCMatches();

	let inserted = 0;
	let updated = 0;

	for (const m of fdMatches) {
		const homeTeam = m.homeTeam.name;
		const awayTeam = m.awayTeam.name;

		// Skip fixtures where teams aren't confirmed yet (knockout TBD)
		if (!homeTeam || !awayTeam) continue;

		const externalId = String(m.id);
		const newStatus = toStatus(m.status);
		const homeScore = m.score.fullTime.home;
		const awayScore = m.score.fullTime.away;

		const existing = await prisma.match.findUnique({ where: { externalId } });

		if (!existing) {
			// New fixture — knockout match just got its teams assigned
			const created = await prisma.match.create({
				data: {
					externalId,
					homeTeam,
					awayTeam,
					group: toGroupLabel(m.group),
					stage: toStage(m.stage) as
						| "GROUP"
						| "ROUND_OF_32"
						| "ROUND_OF_16"
						| "QUARTER_FINAL"
						| "SEMI_FINAL"
						| "FINAL",
					scheduledAt: new Date(m.utcDate),
					status: newStatus as "UPCOMING" | "LIVE" | "FINISHED",
					homeScore: homeScore ?? undefined,
					awayScore: awayScore ?? undefined,
				},
			});

			if (
				newStatus === "FINISHED" &&
				homeScore !== null &&
				awayScore !== null
			) {
				await awardPoints(created.id, homeScore, awayScore);
			}

			inserted++;
			continue;
		}

		// Already in DB — skip if already finished (don't overwrite admin corrections)
		if (existing.status === "FINISHED") continue;

		const wasFinished = newStatus === "FINISHED";

		await prisma.match.update({
			where: { id: existing.id },
			data: {
				status: newStatus as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore: homeScore ?? undefined,
				awayScore: awayScore ?? undefined,
			},
		});

		if (wasFinished && homeScore !== null && awayScore !== null) {
			await awardPoints(existing.id, homeScore, awayScore);
		}

		updated++;
	}

	return NextResponse.json({ ok: true, inserted, updated });
}
