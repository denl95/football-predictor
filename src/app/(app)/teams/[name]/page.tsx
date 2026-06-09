import Image from "next/image";
import { notFound } from "next/navigation";
import { Flag } from "@/components/Flag";
import { prisma } from "@/lib/db";
import { fetchWCTeam } from "@/lib/football-data";
import type { FDPlayer } from "@/lib/football-data";

const POSITION_ORDER = ["Goalkeeper", "Defence", "Midfield", "Offence"] as const;
const POSITION_LABEL: Record<string, string> = {
	Goalkeeper: "Goalkeepers",
	Defence: "Defenders",
	Midfield: "Midfielders",
	Offence: "Forwards",
};

function calcAge(dob: string): number {
	const birth = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	if (
		now.getMonth() < birth.getMonth() ||
		(now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
	) {
		age--;
	}
	return age;
}

export default async function TeamPage({
	params,
}: {
	params: Promise<{ name: string }>;
}) {
	const { name } = await params;
	const teamName = decodeURIComponent(name);

	const [teamData, matches] = await Promise.all([
		fetchWCTeam(teamName),
		prisma.match.findMany({
			where: {
				status: "FINISHED",
				OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
			},
			orderBy: { scheduledAt: "asc" },
		}),
	]);

	if (!teamData) notFound();

	// Compute tournament stats
	let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
	for (const m of matches) {
		if (m.homeScore === null || m.awayScore === null) continue;
		const isHome = m.homeTeam === teamName;
		const teamGoals = isHome ? m.homeScore : m.awayScore;
		const oppGoals = isHome ? m.awayScore : m.homeScore;
		played++;
		gf += teamGoals;
		ga += oppGoals;
		if (teamGoals > oppGoals) won++;
		else if (teamGoals === oppGoals) drawn++;
		else lost++;
	}
	const pts = won * 3 + drawn;

	// Group squad by position
	const byPosition = POSITION_ORDER.reduce<Record<string, FDPlayer[]>>(
		(acc, pos) => {
			acc[pos] = teamData.squad.filter((p) => p.position === pos);
			return acc;
		},
		{},
	);

	// All finished matches (for the fixtures list)
	const allMatches = await prisma.match.findMany({
		where: { OR: [{ homeTeam: teamName }, { awayTeam: teamName }] },
		orderBy: { scheduledAt: "asc" },
	});

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-6">
				{teamData.crest ? (
					<Image
						src={teamData.crest}
						alt={teamName}
						width={72}
						height={72}
						className="shrink-0 object-contain"
					/>
				) : (
					<Flag name={teamName} className="text-5xl" />
				)}
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold">{teamName}</h1>
					{teamData.coach && (
						<p className="text-sm text-foreground-muted">
							Coach: {teamData.coach.name}
							{teamData.coach.dateOfBirth &&
								` · ${calcAge(teamData.coach.dateOfBirth)} yrs`}
						</p>
					)}
					<p className="text-xs text-foreground-muted">
						{teamData.tla} · {teamData.squad.length} players in squad
					</p>
				</div>
			</div>

			{/* Tournament stats */}
			{played > 0 && (
				<div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-border bg-surface">
					{[
						{ label: "P", value: played },
						{ label: "W", value: won, color: "text-accent" },
						{ label: "D", value: drawn },
						{ label: "L", value: lost, color: "text-red-400" },
						{ label: "GF", value: gf },
						{ label: "GA", value: ga },
						{ label: "Pts", value: pts, color: "text-gold" },
					].map((s) => (
						<div
							key={s.label}
							className="flex flex-col items-center gap-1 border-r border-border py-4 last:border-r-0"
						>
							<span
								className={`text-xl font-bold tabular-nums ${s.color ?? "text-foreground"}`}
							>
								{s.value}
							</span>
							<span className="text-xs text-foreground-muted">{s.label}</span>
						</div>
					))}
				</div>
			)}

			{/* Fixtures */}
			{allMatches.length > 0 && (
				<div className="overflow-hidden rounded-2xl border border-border bg-surface">
					<div className="border-b border-border px-4 py-3">
						<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
							Fixtures
						</h2>
					</div>
					<ul>
						{allMatches.map((m) => {
							const isHome = m.homeTeam === teamName;
							const opponent = isHome ? m.awayTeam : m.homeTeam;
							const isFinished = m.status === "FINISHED";
							const teamGoals = isHome ? m.homeScore : m.awayScore;
							const oppGoals = isHome ? m.awayScore : m.homeScore;
							const result =
								isFinished && teamGoals !== null && oppGoals !== null
									? teamGoals > oppGoals
										? "W"
										: teamGoals === oppGoals
											? "D"
											: "L"
									: null;
							const resultColor =
								result === "W"
									? "text-accent"
									: result === "D"
										? "text-foreground-muted"
										: "text-red-400";

							return (
								<li
									key={m.id}
									className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
								>
									<span className="w-5 text-xs font-bold tabular-nums text-foreground-muted">
										{isHome ? "H" : "A"}
									</span>
									<Flag name={opponent} />
									<span className="flex-1 text-sm font-medium">{opponent}</span>
									{isFinished && teamGoals !== null && oppGoals !== null ? (
										<>
											<span className="tabular-nums text-sm">
												{isHome
													? `${teamGoals} – ${oppGoals}`
													: `${oppGoals} – ${teamGoals}`}
											</span>
											<span
												className={`w-6 text-center text-sm font-bold ${resultColor}`}
											>
												{result}
											</span>
										</>
									) : (
										<span className="text-xs text-foreground-muted">
											{new Date(m.scheduledAt).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
											})}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			)}

			{/* Squad */}
			{teamData.squad.length > 0 && (
				<div className="flex flex-col gap-4">
					{POSITION_ORDER.filter((pos) => byPosition[pos]?.length).map((pos) => (
						<div
							key={pos}
							className="overflow-hidden rounded-2xl border border-border bg-surface"
						>
							<div className="border-b border-border px-4 py-3">
								<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
									{POSITION_LABEL[pos]}
								</h2>
							</div>
							<ul>
								{byPosition[pos].map((player) => (
									<li
										key={player.id}
										className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0"
									>
										<div className="flex flex-1 flex-col gap-0.5">
											<span className="text-sm font-semibold">{player.name}</span>
											<span className="flex items-center gap-1 text-xs text-foreground-muted">
												<Flag name={player.nationality} />
												{player.nationality}
											</span>
										</div>
										<span className="text-xs text-foreground-muted">
											{player.dateOfBirth
												? `${calcAge(player.dateOfBirth)} yrs`
												: ""}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
