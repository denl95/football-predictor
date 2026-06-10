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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Bracket slot labels for R32 matches (externalId → [homeLabel, awayLabel]).
// Based on approximate 2026 WC bracket draw seedings — verify with FIFA official bracket.
const R32_LABELS: Record<string, [string, string]> = {
	"537417": ["Group A Winner", "Group D Runner-up"],
	"537423": ["Group B Winner", "Group C Runner-up"],
	"537415": ["Group C Winner", "Group B Runner-up"],
	"537418": ["Group D Winner", "Group A Runner-up"],
	"537424": ["Group E Winner", "Group F Runner-up"],
	"537416": ["Group F Winner", "Group E Runner-up"],
	"537425": ["Best 3rd Place", "Best 3rd Place"],
	"537426": ["Best 3rd Place", "Best 3rd Place"],
	"537422": ["Group G Winner", "Group H Runner-up"],
	"537421": ["Group H Winner", "Group G Runner-up"],
	"537420": ["Group I Winner", "Group J Runner-up"],
	"537419": ["Group J Winner", "Group I Runner-up"],
	"537429": ["Group K Winner", "Group L Runner-up"],
	"537428": ["Group L Winner", "Group K Runner-up"],
	"537427": ["Best 3rd Place", "Best 3rd Place"],
	"537430": ["Best 3rd Place", "Best 3rd Place"],
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
				homeScore: m.score.fullTime.home ?? undefined,
				awayScore: m.score.fullTime.away ?? undefined,
			},
			update: {
				homeTeam,
				awayTeam,
				homeLabel: labels?.[0] ?? null,
				awayLabel: labels?.[1] ?? null,
				scheduledAt: new Date(m.utcDate),
				status: toStatus(m.status) as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore: m.score.fullTime.home ?? undefined,
				awayScore: m.score.fullTime.away ?? undefined,
			},
		});
		upserted++;
	}

	console.log(`Upserted ${upserted} matches.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
