"use client";

import { useState, useTransition } from "react";
import { saveBracketPicks } from "@/actions/bracket";
import { Flag } from "@/components/Flag";
import { teamsForLabel } from "@/lib/bracket";

// ─── Types ────────────────────────────────────────────────────────────────────

type BMatch = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeLabel: string | null;
	awayLabel: string | null;
	scheduledAt: Date;
};

type PickerState = {
	matchId: string;
	homeDisplay: string;
	awayDisplay: string;
	suggested: string[];
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const UNIT = 88; // px height of each R32 slot
const TOTAL = 8 * UNIT; // 704px — full bracket height
const CARD_W = 152; // match card width
const CONN_W = 14; // connector strip width

// ─── Helpers ─────────────────────────────────────────────────────────────────

function effectiveTeam(dbTeam: string, label: string | null): string {
	return dbTeam !== "TBD" ? dbTeam : (label ?? "TBD");
}

function isLabel(s: string): boolean {
	return (
		s === "TBD" ||
		s.includes("Winner") ||
		s.includes("Runner-up") ||
		s.includes("Place")
	);
}

function derivePick(
	feeder: BMatch | undefined,
	picks: Record<string, string>,
): string {
	return feeder ? (picks[feeder.id] ?? "TBD") : "TBD";
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal({
	state,
	allTeams,
	onPick,
	onClose,
}: Readonly<{
	state: PickerState;
	allTeams: string[];
	onPick: (matchId: string, team: string) => void;
	onClose: () => void;
}>) {
	const [search, setSearch] = useState("");
	const q = search.toLowerCase();
	const primary = state.suggested.filter((t) => t.toLowerCase().includes(q));
	const secondary = allTeams.filter(
		(t) => !state.suggested.includes(t) && t.toLowerCase().includes(q),
	);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div>
					<p className="text-xs text-foreground-muted">Pick winner</p>
					<p className="text-sm font-semibold">
						{state.homeDisplay}{" "}
						<span className="text-foreground-muted font-normal">vs</span>{" "}
						{state.awayDisplay}
					</p>
				</div>
				<input
					autoFocus
					placeholder="Search teams…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full rounded-lg bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-foreground-muted focus:ring-1 focus:ring-accent/50"
				/>
				<div className="-mx-1 flex max-h-64 flex-col gap-px overflow-y-auto">
					{primary.length > 0 ? (
						<>
							{search.length === 0 ? (
								<p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-widest text-foreground-muted">
									Likely teams
								</p>
							) : null}
							{primary.map((team) => (
								<button
									key={team}
									type="button"
									className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
									onClick={() => {
										onPick(state.matchId, team);
										onClose();
									}}
								>
									<Flag name={team} />
									<span>{team}</span>
								</button>
							))}
						</>
					) : null}
					{secondary.length > 0 ? (
						<>
							{primary.length > 0 && search.length === 0 ? (
								<p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-foreground-muted">
									All teams
								</p>
							) : null}
							{secondary.slice(0, 24).map((team) => (
								<button
									key={team}
									type="button"
									className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
									onClick={() => {
										onPick(state.matchId, team);
										onClose();
									}}
								>
									<Flag name={team} />
									<span>{team}</span>
								</button>
							))}
						</>
					) : null}
					{primary.length === 0 && secondary.length === 0 ? (
						<p className="px-2 py-4 text-center text-sm text-foreground-muted">
							No teams found
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

// ─── BracketCard ─────────────────────────────────────────────────────────────

function BracketCard({
	match,
	homeDisplay,
	awayDisplay,
	winner,
	suggested,
	allTeams,
	isLocked,
	onPick,
	onOpenPicker,
}: Readonly<{
	match: BMatch;
	homeDisplay: string;
	awayDisplay: string;
	winner: string | null;
	suggested: string[];
	allTeams: string[];
	isLocked: boolean;
	onPick: (matchId: string, team: string) => void;
	onOpenPicker: (state: PickerState) => void;
}>) {
	function handleSide(display: string) {
		if (isLocked) return;
		if (isLabel(display)) {
			onOpenPicker({ matchId: match.id, homeDisplay, awayDisplay, suggested });
		} else {
			onPick(match.id, display);
		}
	}

	const homeSelected = winner === homeDisplay && !isLabel(homeDisplay);
	const awaySelected = winner === awayDisplay && !isLabel(awayDisplay);
	const hasUnknownPick = winner !== null && !homeSelected && !awaySelected;

	return (
		<div
			className="overflow-hidden rounded-lg border border-border bg-surface"
			style={{ width: CARD_W }}
		>
			<button
				type="button"
				onClick={() => handleSide(homeDisplay)}
				className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs transition-colors
					${homeSelected ? "bg-accent/20 font-semibold text-accent" : "text-foreground hover:bg-surface-2"}
					${isLocked ? "cursor-default" : ""}`}
			>
				<Flag name={homeDisplay} />
				<span className="flex-1 truncate">{homeDisplay}</span>
				{homeSelected ? <span className="shrink-0 text-accent">✓</span> : null}
			</button>
			<div className="h-px bg-border/30" />
			<button
				type="button"
				onClick={() => handleSide(awayDisplay)}
				className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs transition-colors
					${awaySelected ? "bg-accent/20 font-semibold text-accent" : "text-foreground hover:bg-surface-2"}
					${isLocked ? "cursor-default" : ""}`}
			>
				<Flag name={awayDisplay} />
				<span className="flex-1 truncate">{awayDisplay}</span>
				{awaySelected ? <span className="shrink-0 text-accent">✓</span> : null}
			</button>
			{hasUnknownPick ? (
				<>
					<div className="h-px bg-border/30" />
					<div className="px-2 py-1 text-[10px] text-foreground-muted">
						{winner}
					</div>
				</>
			) : null}
		</div>
	);
}

// ─── Connector strips (bracket lines) ────────────────────────────────────────

function LeftConnector({ pairs }: Readonly<{ pairs: number }>) {
	const flexPer = 8 / pairs;
	return (
		<div className="flex flex-col" style={{ height: TOTAL, width: CONN_W }}>
			{Array.from({ length: pairs }).map((_, i) => (
				<div key={i} className="flex flex-col" style={{ flex: flexPer * 2 }}>
					<div className="flex-1 rounded-br border-b-2 border-r-2 border-border/40" />
					<div className="flex-1 rounded-tr border-r-2 border-t-2 border-border/40" />
				</div>
			))}
		</div>
	);
}

function RightConnector({ pairs }: Readonly<{ pairs: number }>) {
	const flexPer = 8 / pairs;
	return (
		<div className="flex flex-col" style={{ height: TOTAL, width: CONN_W }}>
			{Array.from({ length: pairs }).map((_, i) => (
				<div key={i} className="flex flex-col" style={{ flex: flexPer * 2 }}>
					<div className="flex-1 rounded-bl border-b-2 border-l-2 border-border/40" />
					<div className="flex-1 rounded-tl border-l-2 border-t-2 border-border/40" />
				</div>
			))}
		</div>
	);
}

function HorizLine({ side }: Readonly<{ side: "left" | "right" }>) {
	return (
		<div
			className={`flex items-center ${side === "right" ? "justify-end" : ""}`}
			style={{ height: TOTAL, width: CONN_W }}
		>
			<div className="h-0.5 w-full bg-border/40" />
		</div>
	);
}

// ─── Bracket column ───────────────────────────────────────────────────────────

type CardInfo = {
	match: BMatch;
	homeDisplay: string;
	awayDisplay: string;
	suggested: string[];
};

function BracketColumn({
	cards,
	unitPer,
	picks,
	allTeams,
	isLocked,
	onPick,
	onOpenPicker,
}: Readonly<{
	cards: CardInfo[];
	unitPer: number;
	picks: Record<string, string>;
	allTeams: string[];
	isLocked: boolean;
	onPick: (matchId: string, team: string) => void;
	onOpenPicker: (state: PickerState) => void;
}>) {
	return (
		<div className="flex flex-col" style={{ height: TOTAL }}>
			{cards.map(({ match, homeDisplay, awayDisplay, suggested }) => (
				<div
					key={match.id}
					className="flex items-center justify-center"
					style={{ flex: unitPer }}
				>
					<BracketCard
						match={match}
						homeDisplay={homeDisplay}
						awayDisplay={awayDisplay}
						winner={picks[match.id] ?? null}
						suggested={suggested}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={onPick}
						onOpenPicker={onOpenPicker}
					/>
				</div>
			))}
		</div>
	);
}

// ─── Main BracketTree component ───────────────────────────────────────────────

export function BracketTree({
	r32,
	r16,
	qf,
	sf,
	finalMatch,
	initialPicks,
	allTeams,
	isLocked,
}: Readonly<{
	r32: BMatch[];
	r16: BMatch[];
	qf: BMatch[];
	sf: BMatch[];
	finalMatch: BMatch | null;
	initialPicks: Record<string, string>;
	allTeams: string[];
	isLocked: boolean;
}>) {
	const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
	const [dirty, setDirty] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [picker, setPicker] = useState<PickerState | null>(null);
	const [pending, startTransition] = useTransition();

	function handlePick(matchId: string, team: string) {
		setPicks((prev) => ({ ...prev, [matchId]: team }));
		setDirty(true);
	}

	function handleSave() {
		setError(null);
		startTransition(async () => {
			const res = await saveBracketPicks(picks);
			if (res.success) {
				setDirty(false);
			} else {
				setError(res.error);
			}
		});
	}

	// Build card info for each column
	// Adjacency: r32[2i]+r32[2i+1] → r16[i], r16[2i]+r16[2i+1] → qf[i], etc.

	function r32Card(i: number): CardInfo {
		const m = r32[i];
		const home = effectiveTeam(m.homeTeam, m.homeLabel);
		const away = effectiveTeam(m.awayTeam, m.awayLabel);
		return {
			match: m,
			homeDisplay: home,
			awayDisplay: away,
			suggested: [...teamsForLabel(m.homeLabel), ...teamsForLabel(m.awayLabel)],
		};
	}

	function higherCard(
		matches: BMatch[],
		feeders: BMatch[],
		i: number,
	): CardInfo {
		const m = matches[i];
		const home = derivePick(feeders[i * 2], picks);
		const away = derivePick(feeders[i * 2 + 1], picks);
		const suggested = [home, away].filter((t) => t !== "TBD");
		return {
			match: m,
			homeDisplay: home === "TBD" ? "TBD" : home,
			awayDisplay: away === "TBD" ? "TBD" : away,
			suggested: suggested.length > 0 ? suggested : allTeams,
		};
	}

	const leftR32 = Array.from({ length: 8 }, (_, i) => r32Card(i));
	const rightR32 = Array.from({ length: 8 }, (_, i) => r32Card(i + 8));

	const leftR16 = Array.from({ length: 4 }, (_, i) => higherCard(r16, r32, i));
	const rightR16 = Array.from({ length: 4 }, (_, i) => higherCard(r16, r32, i + 4));

	const leftQF = Array.from({ length: 2 }, (_, i) => higherCard(qf, r16, i));
	const rightQF = Array.from({ length: 2 }, (_, i) =>
		higherCard(qf, r16, i + 2),
	);

	const leftSF = sf[0] ? [higherCard(sf, qf, 0)] : [];
	const rightSF = sf[1] ? [higherCard(sf, qf, 1)] : [];

	const finalCards: CardInfo[] = finalMatch
		? [higherCard([finalMatch], sf, 0)]
		: [];

	return (
		<div className="flex flex-col gap-4">
			{/* Bracket tree — horizontally scrollable */}
			<div className="overflow-x-auto pb-4">
				<div className="flex items-start" style={{ minWidth: "max-content" }}>
					{/* ── Left half ────────────────────────── */}
					<BracketColumn
						cards={leftR32}
						unitPer={1}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<LeftConnector pairs={4} />
					<BracketColumn
						cards={leftR16}
						unitPer={2}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<LeftConnector pairs={2} />
					<BracketColumn
						cards={leftQF}
						unitPer={4}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<LeftConnector pairs={1} />
					{leftSF.length > 0 ? (
						<BracketColumn
							cards={leftSF}
							unitPer={8}
							picks={picks}
							allTeams={allTeams}
							isLocked={isLocked}
							onPick={handlePick}
							onOpenPicker={setPicker}
						/>
					) : null}
					<HorizLine side="left" />

					{/* ── Final ───────────────────────────── */}
					{finalCards.length > 0 ? (
						<BracketColumn
							cards={finalCards}
							unitPer={8}
							picks={picks}
							allTeams={allTeams}
							isLocked={isLocked}
							onPick={handlePick}
							onOpenPicker={setPicker}
						/>
					) : null}

					{/* ── Right half ───────────────────────── */}
					<HorizLine side="right" />
					{rightSF.length > 0 ? (
						<BracketColumn
							cards={rightSF}
							unitPer={8}
							picks={picks}
							allTeams={allTeams}
							isLocked={isLocked}
							onPick={handlePick}
							onOpenPicker={setPicker}
						/>
					) : null}
					<RightConnector pairs={1} />
					<BracketColumn
						cards={rightQF}
						unitPer={4}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<RightConnector pairs={2} />
					<BracketColumn
						cards={rightR16}
						unitPer={2}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<RightConnector pairs={4} />
					<BracketColumn
						cards={rightR32}
						unitPer={1}
						picks={picks}
						allTeams={allTeams}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
				</div>
			</div>

			{/* Save bar */}
			<div className="flex items-center gap-3">
				{isLocked ? (
					<p className="text-sm text-foreground-muted">
						Bracket is locked — knockout stage has begun
					</p>
				) : (
					<>
						<button
							type="button"
							onClick={handleSave}
							disabled={!dirty || pending}
							className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
						>
							{pending ? "Saving…" : "Save bracket"}
						</button>
						{error ? <p className="text-sm text-red-400">{error}</p> : null}
						{!dirty && !error ? (
							<p className="text-sm text-foreground-muted">All picks saved</p>
						) : null}
					</>
				)}
			</div>

			{/* Picker modal */}
			{picker ? (
				<PickerModal
					state={picker}
					allTeams={allTeams}
					onPick={handlePick}
					onClose={() => setPicker(null)}
				/>
			) : null}
		</div>
	);
}
