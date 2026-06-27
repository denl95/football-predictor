/**
 * Sync match data from football-data.org into the database.
 *
 * Run this on a cron during the tournament (e.g. every 2 minutes on match days):
 *   tsx scripts/sync.ts
 *
 * What it does:
 *  - Updates status / scores on LIVE and FINISHED matches
 *  - Calculates prediction points when a match transitions to FINISHED
 *  - Inserts new knockout fixtures as soon as their teams are confirmed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
	fetchWCMatches,
	toGroupLabel,
	toStage,
	toStatus,
} from "../src/lib/football-data";
import { calculatePoints } from "../src/lib/points";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

async function main() {
	console.log(`[${new Date().toISOString()}] Syncing matches...`);

	const fdMatches = await fetchWCMatches();

	let updated = 0;
	let inserted = 0;

	for (const m of fdMatches) {
		const homeTeam = m.homeTeam.name;
		const awayTeam = m.awayTeam.name;

		// Skip fixtures where teams aren't confirmed yet (knockout TBD)
		if (!homeTeam || !awayTeam) continue;

		const externalId = String(m.id);
		const newStatus = toStatus(m.status);
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
			// New fixture (knockout match just got its teams assigned)
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
					winner,
				},
			});

			// If already finished when first inserted, award points immediately
			if (
				newStatus === "FINISHED" &&
				homeScore !== null &&
				awayScore !== null
			) {
				await awardPoints(created.id, homeScore, awayScore);
			}

			console.log(`  + inserted: ${homeTeam} vs ${awayTeam}`);
			inserted++;
			continue;
		}

		// Skip only when nothing changed. A differing status/score/winner (e.g. a
		// corrected final score) flows through to the update + points recompute, so
		// prediction points stay in sync when a result settles after being recorded.
		if (
			existing.status === newStatus &&
			existing.homeScore === homeScore &&
			existing.awayScore === awayScore &&
			existing.winner === winner
		)
			continue;

		await prisma.match.update({
			where: { id: existing.id },
			data: {
				status: newStatus as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore: homeScore ?? undefined,
				awayScore: awayScore ?? undefined,
				winner,
			},
		});

		if (newStatus === "FINISHED" && homeScore !== null && awayScore !== null) {
			await awardPoints(existing.id, homeScore, awayScore);
			console.log(
				`  ✓ finished: ${homeTeam} ${homeScore}–${awayScore} ${awayTeam}`,
			);
		} else if (newStatus === "LIVE") {
			console.log(`  ~ live: ${homeTeam} vs ${awayTeam}`);
		}

		updated++;
	}

	console.log(`Done. ${inserted} inserted, ${updated} updated.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
