import Link from "next/link";
import {
	CARD_W,
	CONN_W,
	displayLabel,
	HorizLine,
	LeftConnector,
	RightConnector,
	TOTAL,
} from "@/components/bracket-layout";
import { Flag } from "@/components/Flag";

type RealBMatch = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeLabel: string | null;
	awayLabel: string | null;
	homeScore: number | null;
	awayScore: number | null;
	winner: string | null;
	status: "UPCOMING" | "LIVE" | "FINISHED";
};

const COLUMN_LABELS = [
	{ key: "r32-l", label: "Round of 32" },
	{ key: "r16-l", label: "Round of 16" },
	{ key: "qf-l", label: "Quarter-finals" },
	{ key: "sf-l", label: "Semi-finals" },
	{ key: "final", label: "Final" },
	{ key: "sf-r", label: "Semi-finals" },
	{ key: "qf-r", label: "Quarter-finals" },
	{ key: "r16-r", label: "Round of 16" },
	{ key: "r32-r", label: "Round of 32" },
];

function RealBracketCard({ match }: Readonly<{ match: RealBMatch }>) {
	const homeDisplay =
		match.homeTeam !== "TBD"
			? match.homeTeam
			: displayLabel(match.homeLabel ?? "TBD");
	const awayDisplay =
		match.awayTeam !== "TBD"
			? match.awayTeam
			: displayLabel(match.awayLabel ?? "TBD");

	const homeTBD = match.homeTeam === "TBD";
	const awayTBD = match.awayTeam === "TBD";
	const homeWinner = !homeTBD && match.winner === match.homeTeam;
	const awayWinner = !awayTBD && match.winner === match.awayTeam;
	const isLive = match.status === "LIVE";
	const showScores =
		(isLive || match.status === "FINISHED") && match.homeScore !== null;

	const teamRow = (
		display: string,
		score: number | null,
		isTBD: boolean,
		isWinner: boolean,
	) => {
		const base = `flex items-center gap-1.5 px-2 py-1.5 text-xs lg:text-sm ${
			isWinner
				? "bg-accent/20 font-semibold text-accent"
				: isTBD
					? "text-foreground-muted opacity-50"
					: "text-foreground"
		}`;
		const inner = (
			<>
				{!isTBD ? <Flag name={display} /> : null}
				<span className="flex-1 truncate">{display}</span>
				{showScores && score !== null ? (
					<span
						className={`shrink-0 tabular-nums ${isWinner ? "text-accent" : "text-foreground-muted"}`}
					>
						{score}
					</span>
				) : null}
			</>
		);

		// TBD slots aren't real teams yet — render as plain, non-clickable text.
		if (isTBD) return <div className={base}>{inner}</div>;

		return (
			<Link
				href={`/teams/${encodeURIComponent(display)}`}
				className={`${base} transition-colors ${isWinner ? "hover:bg-accent/30" : "hover:bg-surface-2"}`}
			>
				{inner}
			</Link>
		);
	};

	return (
		<div
			className="overflow-hidden rounded-lg border border-border bg-surface"
			style={{ width: CARD_W }}
		>
			{isLive ? (
				<div className="flex items-center gap-1.5 border-b border-border/30 px-2 py-0.5">
					<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
					<span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
						Live
					</span>
				</div>
			) : null}
			{teamRow(homeDisplay, match.homeScore, homeTBD, homeWinner)}
			<div className="h-px bg-border/30" />
			{teamRow(awayDisplay, match.awayScore, awayTBD, awayWinner)}
		</div>
	);
}

function RealColumn({
	matches,
	unitPer,
}: Readonly<{ matches: RealBMatch[]; unitPer: number }>) {
	return (
		<div className="flex flex-col" style={{ height: TOTAL }}>
			{matches.map((m) => (
				<div
					key={m.id}
					className="flex items-center justify-center"
					style={{ flex: unitPer }}
				>
					<RealBracketCard match={m} />
				</div>
			))}
		</div>
	);
}

export function RealBracketTree({
	r32,
	r16,
	qf,
	sf,
	finalMatch,
}: Readonly<{
	r32: RealBMatch[];
	r16: RealBMatch[];
	qf: RealBMatch[];
	sf: RealBMatch[];
	finalMatch: RealBMatch | null;
}>) {
	const leftR32 = r32.slice(0, 8);
	const rightR32 = r32.slice(8, 16);
	const leftR16 = r16.slice(0, 4);
	const rightR16 = r16.slice(4, 8);
	const leftQF = qf.slice(0, 2);
	const rightQF = qf.slice(2, 4);
	const leftSF = sf.slice(0, 1);
	const rightSF = sf.slice(1, 2);

	return (
		<div className="flex flex-col gap-4 [--bk-card:152px] [--bk-conn:14px] [--bk-unit:84px] md:[--bk-card:168px] md:[--bk-conn:16px] md:[--bk-unit:96px] lg:[--bk-card:190px] lg:[--bk-conn:18px] lg:[--bk-unit:110px] xl:[--bk-card:212px] xl:[--bk-conn:20px] xl:[--bk-unit:124px] 2xl:[--bk-card:236px] 2xl:[--bk-conn:24px] 2xl:[--bk-unit:140px]">
			<div className="overflow-x-auto pb-4 xl:ml-[calc(50%-50vw)] xl:mr-[calc(50%-50vw)] xl:w-screen xl:px-8">
				{/* Column headers */}
				<div className="mb-2 flex" style={{ minWidth: "max-content" }}>
					{COLUMN_LABELS.map((col, i) => (
						<div key={col.key} className="flex">
							<div
								className="flex items-center justify-center text-center"
								style={{ width: CARD_W }}
							>
								<span className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted lg:text-xs">
									{col.label}
								</span>
							</div>
							{i < COLUMN_LABELS.length - 1 ? (
								<div style={{ width: CONN_W }} />
							) : null}
						</div>
					))}
				</div>
				{/* Bracket */}
				<div className="flex items-start" style={{ minWidth: "max-content" }}>
					<RealColumn matches={leftR32} unitPer={1} />
					<LeftConnector pairs={4} />
					<RealColumn matches={leftR16} unitPer={2} />
					<LeftConnector pairs={2} />
					<RealColumn matches={leftQF} unitPer={4} />
					<LeftConnector pairs={1} />
					{leftSF.length > 0 ? (
						<RealColumn matches={leftSF} unitPer={8} />
					) : null}
					<HorizLine side="left" />
					{finalMatch ? (
						<RealColumn matches={[finalMatch]} unitPer={8} />
					) : null}
					<HorizLine side="right" />
					{rightSF.length > 0 ? (
						<RealColumn matches={rightSF} unitPer={8} />
					) : null}
					<RightConnector pairs={1} />
					<RealColumn matches={rightQF} unitPer={4} />
					<RightConnector pairs={2} />
					<RealColumn matches={rightR16} unitPer={2} />
					<RightConnector pairs={4} />
					<RealColumn matches={rightR32} unitPer={1} />
				</div>
			</div>
		</div>
	);
}
