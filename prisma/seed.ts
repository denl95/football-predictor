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
// Mirrors the official FIFA World Cup 2026 knockout bracket: 8 group winners face
// best-third-place teams, 4 winners face runners-up, and 4 runner-up-vs-runner-up
// ties. Labels are assigned per externalId so that the bracket's positional pairing
// (matches sorted by scheduledAt) reproduces FIFA's exact R16→QF→SF→Final routing.
// Each comment notes the official FIFA match number this slot corresponds to.
const R32_LABELS: Record<string, [string, string]> = {
	"537417": ["Group E Winner", "Best 3rd Place (ABCDF)"], // M74
	"537423": ["Group I Winner", "Best 3rd Place (CDFGH)"], // M77
	"537415": ["Group A Runner-up", "Group B Runner-up"], // M73
	"537418": ["Group F Winner", "Group C Runner-up"], // M75
	"537424": ["Group K Runner-up", "Group L Runner-up"], // M83
	"537416": ["Group H Winner", "Group J Runner-up"], // M84
	"537425": ["Group D Winner", "Best 3rd Place (BEFIJ)"], // M81
	"537426": ["Group G Winner", "Best 3rd Place (AEHIJ)"], // M82
	"537422": ["Group C Winner", "Group F Runner-up"], // M76
	"537421": ["Group E Runner-up", "Group I Runner-up"], // M78
	"537420": ["Group A Winner", "Best 3rd Place (CEFHI)"], // M79
	"537419": ["Group L Winner", "Best 3rd Place (EHIJK)"], // M80
	"537429": ["Group J Winner", "Group H Runner-up"], // M86
	"537428": ["Group D Runner-up", "Group G Runner-up"], // M88
	"537427": ["Group B Winner", "Best 3rd Place (EFGIJ)"], // M85
	"537430": ["Group K Winner", "Best 3rd Place"], // M87
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
