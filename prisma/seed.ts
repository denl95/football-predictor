import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { R32_LABELS } from "../src/lib/bracket";
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

const KNOCKOUT_STAGES = new Set([
	"ROUND_OF_32",
	"ROUND_OF_16",
	"QUARTER_FINAL",
	"SEMI_FINAL",
	"FINAL",
]);

async function main() {
	console.log("Fetching WC 2026 fixtures from football-data.org...");
	const fdMatches = await fetchWCMatches();

	const toSeed = fdMatches.filter((m) => {
		const stage = toStage(m.stage);
		return stage === "GROUP" || KNOCKOUT_STAGES.has(stage);
	});

	console.log(`Found ${toSeed.length} matches to upsert`);

	let upserted = 0;
	for (const m of toSeed) {
		const stage = toStage(m.stage) as
			| "GROUP"
			| "ROUND_OF_32"
			| "ROUND_OF_16"
			| "QUARTER_FINAL"
			| "SEMI_FINAL"
			| "FINAL";
		const externalId = String(m.id);
		const homeTeam = m.homeTeam.name ?? "TBD";
		const awayTeam = m.awayTeam.name ?? "TBD";
		const labels = stage === "ROUND_OF_32" ? R32_LABELS[externalId] : undefined;

		await prisma.match.upsert({
			where: { externalId },
			create: {
				externalId,
				homeTeam,
				awayTeam,
				homeLabel: labels?.[0] ?? null,
				awayLabel: labels?.[1] ?? null,
				group: toGroupLabel(m.group),
				stage,
				scheduledAt: new Date(m.utcDate),
				status: toStatus(m.status) as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore:
					m.score.regularTime?.home ?? m.score.fullTime.home ?? undefined,
				awayScore:
					m.score.regularTime?.away ?? m.score.fullTime.away ?? undefined,
				winner:
					m.score.winner === "HOME_TEAM"
						? homeTeam
						: m.score.winner === "AWAY_TEAM"
							? awayTeam
							: null,
			},
			update: {
				homeTeam,
				awayTeam,
				homeLabel: labels?.[0] ?? null,
				awayLabel: labels?.[1] ?? null,
				scheduledAt: new Date(m.utcDate),
				status: toStatus(m.status) as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore:
					m.score.regularTime?.home ?? m.score.fullTime.home ?? undefined,
				awayScore:
					m.score.regularTime?.away ?? m.score.fullTime.away ?? undefined,
				winner:
					m.score.winner === "HOME_TEAM"
						? homeTeam
						: m.score.winner === "AWAY_TEAM"
							? awayTeam
							: null,
			},
		});
		upserted++;
	}

	console.log(`Upserted ${upserted} matches.`);

	// Recompute prediction points for every finished match — upserting scores above
	// does not touch existing predictions, so without this a corrected final score
	// would leave previously-awarded points stale.
	const finished = await prisma.match.findMany({
		where: {
			status: "FINISHED",
			homeScore: { not: null },
			awayScore: { not: null },
		},
		select: { id: true, homeScore: true, awayScore: true },
	});
	let repointed = 0;
	for (const m of finished) {
		const preds = await prisma.prediction.findMany({
			where: { matchId: m.id },
		});
		for (const p of preds) {
			const points = calculatePoints(
				p.homeScore,
				p.awayScore,
				m.homeScore as number,
				m.awayScore as number,
			);
			if (points !== p.points) {
				await prisma.prediction.update({
					where: { id: p.id },
					data: { points },
				});
				repointed++;
			}
		}
	}
	console.log(`Recomputed points for ${repointed} predictions.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
