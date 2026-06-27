"use client";

import { useState } from "react";
import { BracketTree } from "@/components/BracketTree";
import { RealBracketTree } from "@/components/RealBracketTree";
import { STAGE_LABEL, STAGE_POINTS } from "@/lib/bracket";

type Tab = "prediction" | "real";

type KnockoutMatch = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeLabel: string | null;
	awayLabel: string | null;
	homeScore: number | null;
	awayScore: number | null;
	winner: string | null;
	status: "UPCOMING" | "LIVE" | "FINISHED";
	scheduledAt: Date;
};

type Props = {
	// Both brackets share one kick-off-ordered set so they line up position-by-position.
	r32: KnockoutMatch[];
	r16: KnockoutMatch[];
	qf: KnockoutMatch[];
	sf: KnockoutMatch[];
	finalMatch: KnockoutMatch | null;
	initialPicks: Record<string, string>;
	initialSlotPicks: Record<string, { home?: string; away?: string }>;
	allTeams: string[];
	isLocked: boolean;
	totalPoints: number;
	hasPoints: boolean;
};

export function BracketPageClient({
	r32,
	r16,
	qf,
	sf,
	finalMatch,
	initialPicks,
	initialSlotPicks,
	allTeams,
	isLocked,
	totalPoints,
	hasPoints,
}: Readonly<Props>) {
	const [tab, setTab] = useState<Tab>("prediction");

	return (
		<div className="flex flex-col gap-6">
			{/* Tab toggle */}
			<div className="flex w-fit overflow-hidden rounded-xl border border-border">
				<button
					type="button"
					onClick={() => setTab("prediction")}
					className={`px-4 py-2 text-sm font-medium transition-colors ${
						tab === "prediction"
							? "bg-surface-2 text-foreground"
							: "text-foreground-muted hover:text-foreground"
					}`}
				>
					My Predictions
				</button>
				<button
					type="button"
					onClick={() => setTab("real")}
					className={`px-4 py-2 text-sm font-medium transition-colors ${
						tab === "real"
							? "bg-surface-2 text-foreground"
							: "text-foreground-muted hover:text-foreground"
					}`}
				>
					Real Bracket
				</button>
			</div>

			{tab === "prediction" ? (
				<>
					{hasPoints ? (
						<div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
							<span className="text-2xl font-bold text-gold tabular-nums">
								{totalPoints}
							</span>
							<span className="text-sm text-foreground-muted">
								bracket points earned
							</span>
						</div>
					) : null}

					<div className="flex flex-wrap gap-2">
						{(
							[
								"ROUND_OF_32",
								"ROUND_OF_16",
								"QUARTER_FINAL",
								"SEMI_FINAL",
								"FINAL",
								"CHAMPION",
							] as const
						).map((stage) => (
							<div
								key={stage}
								className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
									stage === "CHAMPION"
										? "border-gold/40 bg-gold/10"
										: "border-border bg-surface"
								}`}
							>
								<span className="text-foreground-muted">
									{STAGE_LABEL[stage]}
								</span>
								<span
									className={`font-semibold ${
										stage === "CHAMPION" ? "text-gold" : "text-accent"
									}`}
								>
									+{STAGE_POINTS[stage]}pts
								</span>
							</div>
						))}
					</div>

					<BracketTree
						r32={r32}
						r16={r16}
						qf={qf}
						sf={sf}
						finalMatch={finalMatch}
						initialPicks={initialPicks}
						initialSlotPicks={initialSlotPicks}
						allTeams={allTeams}
						isLocked={isLocked}
					/>
				</>
			) : (
				<RealBracketTree
					r32={r32}
					r16={r16}
					qf={qf}
					sf={sf}
					finalMatch={finalMatch}
				/>
			)}
		</div>
	);
}
