"use client";

import { useTransition, useState, useCallback } from "react";
import { Flag } from "@/components/Flag";
import { saveBracketPicks } from "@/actions/bracket";
import {
	BRACKET_STAGES,
	STAGE_LABEL,
	STAGE_LIMIT,
	STAGE_POINTS,
} from "@/lib/bracket";

type Picks = Record<string, string[]>;

function stageIndex(stage: string): number {
	return BRACKET_STAGES.indexOf(stage as (typeof BRACKET_STAGES)[number]);
}

export function BracketPicker({
	allTeams,
	initialPicks,
	isLocked,
}: Readonly<{
	allTeams: string[];
	initialPicks: Picks;
	isLocked: boolean;
}>) {
	const [picks, setPicks] = useState<Picks>(() => {
		const p: Picks = {};
		for (const s of BRACKET_STAGES) p[s] = initialPicks[s] ?? [];
		return p;
	});
	const [dirty, setDirty] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searches, setSearches] = useState<Record<string, string>>({});
	const [pending, startTransition] = useTransition();

	const addTeam = useCallback((stage: string, team: string) => {
		setPicks((prev) => {
			const next = { ...prev };
			const idx = stageIndex(stage);
			// Add to this stage and all prerequisite stages (earlier in the funnel)
			for (let i = 0; i <= idx; i++) {
				const s = BRACKET_STAGES[i];
				if (!next[s].includes(team)) next[s] = [...next[s], team];
			}
			return next;
		});
		setDirty(true);
		setSearches((prev) => ({ ...prev, [stage]: "" }));
	}, []);

	const removeTeam = useCallback((stage: string, team: string) => {
		setPicks((prev) => {
			const next = { ...prev };
			const idx = stageIndex(stage);
			// Remove from this stage and all later stages
			for (let i = idx; i < BRACKET_STAGES.length; i++) {
				const s = BRACKET_STAGES[i];
				next[s] = next[s].filter((t) => t !== team);
			}
			return next;
		});
		setDirty(true);
	}, []);

	function handleSave() {
		setError(null);
		startTransition(async () => {
			const result = await saveBracketPicks(picks);
			if (result.success) {
				setDirty(false);
			} else {
				setError(result.error);
			}
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Stage columns — horizontally scrollable */}
			<div className="overflow-x-auto pb-2">
				<div className="flex gap-2 min-w-max items-start">
					{BRACKET_STAGES.map((stage, i) => {
						const stagePicks = picks[stage];
						const limit = STAGE_LIMIT[stage];
						const search = searches[stage] ?? "";
						const full = stagePicks.length >= limit;

						const available = allTeams.filter(
							(t) =>
								!stagePicks.includes(t) &&
								t.toLowerCase().includes(search.toLowerCase()),
						);

						return (
							<div key={stage} className="flex items-start gap-2">
								{i > 0 && (
									<div className="mt-10 text-foreground-muted text-lg select-none">
										›
									</div>
								)}

								<div className="w-44 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
									{/* Column header */}
									<div className="border-b border-border px-3 py-2.5 flex flex-col gap-0.5">
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
												{STAGE_LABEL[stage]}
											</span>
											<span
												className={`text-xs font-bold tabular-nums ${full ? "text-accent" : "text-foreground-muted"}`}
											>
												{stagePicks.length}/{limit}
											</span>
										</div>
										<span className="text-xs text-foreground-muted">
											+{STAGE_POINTS[stage]} pt{STAGE_POINTS[stage] !== 1 ? "s" : ""} each
										</span>
									</div>

									{/* Selected teams */}
									<div className="flex flex-col gap-px p-1.5 min-h-12 max-h-64 overflow-y-auto">
										{stagePicks.length === 0 && (
											<p className="px-2 py-3 text-center text-xs text-foreground-muted">
												No picks yet
											</p>
										)}
										{stagePicks.map((team) => (
											<div
												key={team}
												className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 bg-surface-2"
											>
												<Flag name={team} />
												<span className="flex-1 text-xs font-medium truncate">
													{team}
												</span>
												{!isLocked && (
													<button
														type="button"
														onClick={() => removeTeam(stage, team)}
														className="shrink-0 text-foreground-muted hover:text-red-400 transition-colors leading-none"
														aria-label={`Remove ${team}`}
													>
														×
													</button>
												)}
											</div>
										))}
									</div>

									{/* Add team search */}
									{!isLocked && !full && (
										<div className="border-t border-border p-1.5 flex flex-col gap-1">
											<input
												type="text"
												placeholder="Search team…"
												value={search}
												onChange={(e) =>
													setSearches((prev) => ({
														...prev,
														[stage]: e.target.value,
													}))
												}
												className="w-full rounded-lg bg-surface-2 px-2 py-1 text-xs outline-none placeholder:text-foreground-muted focus:ring-1 focus:ring-accent/50"
											/>
											{search.length > 0 && (
												<div className="flex flex-col gap-px max-h-36 overflow-y-auto">
													{available.length === 0 && (
														<p className="px-2 py-1.5 text-xs text-foreground-muted">
															No matches
														</p>
													)}
													{available.slice(0, 8).map((team) => (
														<button
															key={team}
															type="button"
															onClick={() => addTeam(stage, team)}
															className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-2 transition-colors text-left"
														>
															<Flag name={team} />
															<span className="truncate">{team}</span>
														</button>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Save / status bar */}
			<div className="flex items-center gap-3">
				{!isLocked && (
					<button
						type="button"
						onClick={handleSave}
						disabled={!dirty || pending}
						className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
					>
						{pending ? "Saving…" : "Save bracket"}
					</button>
				)}
				{error && <p className="text-sm text-red-400">{error}</p>}
				{!dirty && !error && !isLocked && (
					<p className="text-sm text-foreground-muted">All picks saved</p>
				)}
				{isLocked && (
					<p className="text-sm text-foreground-muted">
						Bracket is locked — knockout stage has begun
					</p>
				)}
			</div>
		</div>
	);
}
