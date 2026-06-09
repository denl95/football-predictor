import { Flag } from "@/components/Flag";
import { prisma } from "@/lib/db";

type TeamStanding = {
	team: string;
	played: number;
	won: number;
	drawn: number;
	lost: number;
	gf: number;
	ga: number;
	gd: number;
	points: number;
};

export default async function GroupsPage() {
	const matches = await prisma.match.findMany({
		where: { stage: "GROUP" },
		orderBy: { scheduledAt: "asc" },
	});

	// Build standings per group
	const groups: Record<string, Record<string, TeamStanding>> = {};

	for (const m of matches) {
		const groupKey = m.group ?? "Unknown";

		if (!groups[groupKey]) groups[groupKey] = {};

		// Register both teams (so they appear even with 0 matches played)
		for (const team of [m.homeTeam, m.awayTeam]) {
			if (!groups[groupKey][team]) {
				groups[groupKey][team] = {
					team,
					played: 0,
					won: 0,
					drawn: 0,
					lost: 0,
					gf: 0,
					ga: 0,
					gd: 0,
					points: 0,
				};
			}
		}

		// Add stats for finished matches only
		if (
			m.status === "FINISHED" &&
			m.homeScore !== null &&
			m.awayScore !== null
		) {
			const home = groups[groupKey][m.homeTeam];
			const away = groups[groupKey][m.awayTeam];

			home.played++;
			away.played++;
			home.gf += m.homeScore;
			home.ga += m.awayScore;
			away.gf += m.awayScore;
			away.ga += m.homeScore;

			if (m.homeScore > m.awayScore) {
				home.won++;
				home.points += 3;
				away.lost++;
			} else if (m.homeScore < m.awayScore) {
				away.won++;
				away.points += 3;
				home.lost++;
			} else {
				home.drawn++;
				away.drawn++;
				home.points++;
				away.points++;
			}

			home.gd = home.gf - home.ga;
			away.gd = away.gf - away.ga;
		}
	}

	// Sort teams within each group: points → gd → gf → name
	const sortedGroups = Object.entries(groups)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([groupName, teams]) => ({
			groupName,
			standings: Object.values(teams).sort(
				(a, b) =>
					b.points - a.points ||
					b.gd - a.gd ||
					b.gf - a.gf ||
					a.team.localeCompare(b.team),
			),
		}));

	if (sortedGroups.length === 0) {
		return (
			<div className="flex flex-col gap-4">
				<h1 className="text-2xl font-bold">Groups</h1>
				<p className="text-foreground-muted">
					Group stage fixtures haven't been loaded yet.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-2xl font-bold">Groups</h1>

			<div className="grid gap-4 sm:grid-cols-2">
				{sortedGroups.map(({ groupName, standings }) => (
					<div
						key={groupName}
						className="overflow-hidden rounded-2xl border border-border bg-surface"
					>
						<div className="border-b border-border px-4 py-3">
							<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
								{groupName}
							</h2>
						</div>

						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-foreground-muted">
									<th className="py-2 pl-3 pr-1 text-left font-medium sm:pl-4 sm:pr-2">
										Team
									</th>
									<th className="px-1 py-2 text-center font-medium sm:px-2">
										P
									</th>
									<th className="px-1 py-2 text-center font-medium sm:px-2">
										W
									</th>
									<th className="px-1 py-2 text-center font-medium sm:px-2">
										D
									</th>
									<th className="px-1 py-2 text-center font-medium sm:px-2">
										L
									</th>
									<th className="hidden px-1 py-2 text-center font-medium sm:table-cell sm:px-2">
										GF
									</th>
									<th className="hidden px-1 py-2 text-center font-medium sm:table-cell sm:px-2">
										GA
									</th>
									<th className="px-1 py-2 text-center font-medium sm:px-2">
										GD
									</th>
									<th className="py-2 pl-1 pr-3 text-center font-medium sm:pl-2 sm:pr-3">
										Pts
									</th>
								</tr>
							</thead>
							<tbody>
								{standings.map((s, i) => (
									<tr
										key={s.team}
										className={`border-b border-border/50 last:border-b-0 ${i < 2 ? "bg-accent/5" : ""}`}
									>
										<td className="py-2.5 pl-3 pr-1 sm:pl-4 sm:pr-2">
											<div className="flex items-center gap-1.5 sm:gap-2">
												<Flag name={s.team} />
												<span className="font-medium leading-tight">
													{s.team}
												</span>
											</div>
										</td>
										<td className="px-1 py-2.5 text-center tabular-nums text-foreground-muted sm:px-2">
											{s.played}
										</td>
										<td className="px-1 py-2.5 text-center tabular-nums sm:px-2">
											{s.won}
										</td>
										<td className="px-1 py-2.5 text-center tabular-nums sm:px-2">
											{s.drawn}
										</td>
										<td className="px-1 py-2.5 text-center tabular-nums sm:px-2">
											{s.lost}
										</td>
										<td className="hidden px-1 py-2.5 text-center tabular-nums sm:table-cell sm:px-2">
											{s.gf}
										</td>
										<td className="hidden px-1 py-2.5 text-center tabular-nums sm:table-cell sm:px-2">
											{s.ga}
										</td>
										<td className="px-1 py-2.5 text-center tabular-nums sm:px-2">
											{s.gd > 0 ? `+${s.gd}` : s.gd}
										</td>
										<td className="py-2.5 pl-1 pr-3 text-center font-bold tabular-nums text-accent sm:pl-2 sm:pr-3">
											{s.points}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				))}
			</div>

			<p className="text-center text-xs text-foreground-muted">
				Top 2 teams from each group advance · shaded rows qualify
			</p>
		</div>
	);
}
