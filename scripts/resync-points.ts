import "dotenv/config";
import { prisma } from "../src/lib/db";
import { calculatePoints } from "../src/lib/points";

// Recompute Prediction.points for every finished match against its current
// stored score. Use this after a match score is corrected, since the cron sync
// skips matches that are already FINISHED with scores and won't re-award points.
async function main() {
	const matches = await prisma.match.findMany({
		where: {
			status: "FINISHED",
			homeScore: { not: null },
			awayScore: { not: null },
		},
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeScore: true,
			awayScore: true,
		},
	});

	let changed = 0;
	let scanned = 0;

	for (const m of matches) {
		const homeScore = m.homeScore as number;
		const awayScore = m.awayScore as number;
		const predictions = await prisma.prediction.findMany({
			where: { matchId: m.id },
		});

		for (const p of predictions) {
			scanned++;
			const points = calculatePoints(
				p.homeScore,
				p.awayScore,
				homeScore,
				awayScore,
			);
			if (p.points !== points) {
				await prisma.prediction.update({
					where: { id: p.id },
					data: { points },
				});
				changed++;
				console.log(
					`${m.homeTeam} ${homeScore}-${awayScore} ${m.awayTeam}: ${p.homeScore}-${p.awayScore} ${p.points ?? "—"} → ${points} pts`,
				);
			}
		}
	}

	console.log(
		`\nResynced ${matches.length} finished matches, ${scanned} predictions scanned, ${changed} updated.`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => process.exit(0));
