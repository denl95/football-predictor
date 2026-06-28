import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { R32_LABELS } from "@/lib/bracket";
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

		if (!homeTeam || !awayTeam) continue;

		const externalId = String(m.id);
		const newStatus = toStatus(m.status);
		const stage = toStage(m.stage) as
			| "GROUP"
			| "ROUND_OF_32"
			| "ROUND_OF_16"
			| "QUARTER_FINAL"
			| "SEMI_FINAL"
			| "FINAL";
		const labels = stage === "ROUND_OF_32" ? R32_LABELS[externalId] : undefined;
		// Use regularTime (90-min score) for points — fullTime can include ET goals.
		const homeScore = m.score.regularTime?.home ?? m.score.fullTime.home;
		const awayScore = m.score.regularTime?.away ?? m.score.fullTime.away;
		const winner =
			m.score.winner === "HOME_TEAM"
				? homeTeam
				: m.score.winner === "AWAY_TEAM"
					? awayTeam
					: null;

		const existing = await prisma.match.findUnique({ where: { externalId } });

		if (!existing) {
			const created = await prisma.match.create({
				data: {
					externalId,
					homeTeam,
					awayTeam,
					homeLabel: labels?.[0] ?? null,
					awayLabel: labels?.[1] ?? null,
					group: toGroupLabel(m.group),
					stage,
					scheduledAt: new Date(m.utcDate),
					status: newStatus as "UPCOMING" | "LIVE" | "FINISHED",
					homeScore: homeScore ?? undefined,
					awayScore: awayScore ?? undefined,
					winner,
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

		// Skip only when nothing changed. Knockout matches resolve their teams over
		// time (TBD → real teams), so detect team changes too — otherwise confirmed
		// playoff teams never get written. A status/score/winner change likewise flows
		// through and re-awards points.
		if (
			existing.status === newStatus &&
			existing.homeTeam === homeTeam &&
			existing.awayTeam === awayTeam &&
			existing.homeScore === homeScore &&
			existing.awayScore === awayScore &&
			existing.winner === winner
		)
			continue;

		await prisma.match.update({
			where: { id: existing.id },
			data: {
				homeTeam,
				awayTeam,
				scheduledAt: new Date(m.utcDate),
				status: newStatus as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore: homeScore ?? undefined,
				awayScore: awayScore ?? undefined,
				winner,
			},
		});

		if (newStatus === "FINISHED" && homeScore !== null && awayScore !== null) {
			await awardPoints(existing.id, homeScore, awayScore);
		}

		updated++;
	}

	return NextResponse.json({ ok: true, inserted, updated });
}
