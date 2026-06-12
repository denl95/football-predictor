import Link from "next/link";
import type { SerializedMatch } from "@/components/MatchList";
import { MatchList } from "@/components/MatchList";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// view param encodes both mode and grouping:
//   (none)           → upcoming, by day
//   group            → upcoming, by group
//   results          → results,  by day
//   results-group    → results,  by group
export default async function MatchesPage({
	searchParams,
}: {
	searchParams: Promise<{ view?: string }>;
}) {
	const { view } = await searchParams;
	const isResults = view === "results" || view === "results-group";
	const byDay = view !== "group" && view !== "results-group";

	const session = await auth();

	const matches = await prisma.match.findMany({
		orderBy: { scheduledAt: "asc" },
		include: {
			predictions: session?.user?.id
				? { where: { userId: session.user.id } }
				: false,
		},
	});

	const serialized: SerializedMatch[] = matches.map((m) => ({
		id: m.id,
		homeTeam: m.homeTeam,
		awayTeam: m.awayTeam,
		group: m.group,
		stage: m.stage,
		status: m.status,
		scheduledAt: m.scheduledAt.toISOString(),
		homeScore: m.homeScore ?? null,
		awayScore: m.awayScore ?? null,
		prediction:
			Array.isArray(m.predictions) && m.predictions[0]
				? {
						homeScore: m.predictions[0].homeScore,
						awayScore: m.predictions[0].awayScore,
						points: m.predictions[0].points ?? null,
					}
				: null,
	}));

	const upcomingOnly = serialized.filter((m) => m.status === "UPCOMING");
	const predictedCount = upcomingOnly.filter((m) => m.prediction).length;
	const totalUpcoming = upcomingOnly.length;

	// Mode tabs — switch between Upcoming and Results
	const modeTabs = [
		{
			label: "Upcoming",
			href: byDay ? "/matches" : "/matches?view=group",
			active: !isResults,
		},
		{
			label: "Results",
			href: byDay ? "/matches?view=results" : "/matches?view=results-group",
			active: isResults,
		},
	];

	// Grouping tabs — switch between By Day and By Group, preserving the current mode
	const groupTabs = [
		{
			label: "By Day",
			href: isResults ? "/matches?view=results" : "/matches",
			active: byDay,
		},
		{
			label: "By Group",
			href: isResults ? "/matches?view=results-group" : "/matches?view=group",
			active: !byDay,
		},
	];

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Matches</h1>
				<p className="text-sm text-foreground-muted">
					{predictedCount} / {totalUpcoming} upcoming matches predicted
				</p>
			</div>

			<div className="flex flex-col gap-2">
				{/* Mode: Upcoming | Results */}
				<div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
					{modeTabs.map((tab) => (
						<Link
							key={tab.label}
							href={tab.href}
							className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
								tab.active
									? "bg-surface-2 text-foreground"
									: "text-foreground-muted hover:text-foreground"
							}`}
						>
							{tab.label}
						</Link>
					))}
				</div>

				{/* Grouping: By Day | By Group */}
				<div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
					{groupTabs.map((tab) => (
						<Link
							key={tab.label}
							href={tab.href}
							className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
								tab.active
									? "bg-surface-2 text-foreground"
									: "text-foreground-muted hover:text-foreground"
							}`}
						>
							{tab.label}
						</Link>
					))}
				</div>
			</div>

			<MatchList matches={serialized} byDay={byDay} isResults={isResults} />
		</div>
	);
}
