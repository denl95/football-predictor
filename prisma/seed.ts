import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
	fetchWCMatches,
	toFlag,
	toGroupLabel,
	toStage,
	toStatus,
} from "../src/lib/football-data";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log("Fetching WC 2026 fixtures from football-data.org...");
	const fdMatches = await fetchWCMatches();

	// Only seed group stage matches — teams for knockout stages aren't confirmed yet
	const groupMatches = fdMatches.filter((m) => m.stage === "GROUP_STAGE");
	console.log(`Found ${groupMatches.length} group stage matches`);

	console.log("Clearing existing matches...");
	await prisma.match.deleteMany();

	let inserted = 0;
	for (const m of groupMatches) {
		const homeTeam = m.homeTeam.name;
		const awayTeam = m.awayTeam.name;
		if (!homeTeam || !awayTeam) continue;

		await prisma.match.create({
			data: {
				externalId: String(m.id),
				homeTeam,
				awayTeam,
				homeFlag: toFlag(homeTeam),
				awayFlag: toFlag(awayTeam),
				group: toGroupLabel(m.group),
				stage: toStage(m.stage) as "GROUP",
				scheduledAt: new Date(m.utcDate),
				status: toStatus(m.status) as "UPCOMING" | "LIVE" | "FINISHED",
				homeScore: m.score.fullTime.home ?? undefined,
				awayScore: m.score.fullTime.away ?? undefined,
			},
		});
		inserted++;
	}

	console.log(`Seeded ${inserted} group stage matches.`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
