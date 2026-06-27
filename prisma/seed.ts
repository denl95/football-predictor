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

// Bracket slot labels for R32 matches (externalId → [homeLabel, awayLabel]).
// Mirrors the official FIFA World Cup 2026 knockout bracket. The externalId→slot
// mapping was derived from the official FIFA routing and verified against the
// resolved teams (e.g. 537417 = South Africa/Canada = Runner-up A vs Runner-up B).
// Each comment notes the official FIFA match number this slot corresponds to.
// Bracket-position ordering lives in BRACKET_ORDER (src/lib/bracket.ts).
const R32_LABELS: Record<string, [string, string]> = {
	"537417": ["Group A Runner-up", "Group B Runner-up"], // M73
	"537415": ["Group E Winner", "Best 3rd Place (ABCDF)"], // M74
	"537418": ["Group F Winner", "Group C Runner-up"], // M75
	"537423": ["Group C Winner", "Group F Runner-up"], // M76
	"537416": ["Group I Winner", "Best 3rd Place (CDFGH)"], // M77
	"537424": ["Group E Runner-up", "Group I Runner-up"], // M78
	"537425": ["Group A Winner", "Best 3rd Place (CEFHI)"], // M79
	"537426": ["Group L Winner", "Best 3rd Place (EHIJK)"], // M80
	"537421": ["Group D Winner", "Best 3rd Place (BEFIJ)"], // M81
	"537422": ["Group G Winner", "Best 3rd Place (AEHIJ)"], // M82
	"537419": ["Group K Runner-up", "Group L Runner-up"], // M83
	"537420": ["Group H Winner", "Group J Runner-up"], // M84
	"537429": ["Group B Winner", "Best 3rd Place (EFGIJ)"], // M85
	"537427": ["Group J Winner", "Group H Runner-up"], // M86
	"537430": ["Group K Winner", "Best 3rd Place (DEIJL)"], // M87
	"537428": ["Group D Runner-up", "Group G Runner-up"], // M88
};

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
