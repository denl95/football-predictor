"use client";

import { useState, useTransition } from "react";
import { saveBracketPicks } from "@/actions/bracket";
import { Flag } from "@/components/Flag";
import { GROUPS, teamsForLabel } from "@/lib/bracket";

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
	homeGroup: string | null;
	awayGroup: string | null;
	suggested: string[];
};

type CardInfo = {
	match: BMatch;
	homeDisplay: string;
	awayDisplay: string;
	homeGroup: string | null;
	awayGroup: string | null;
	suggested: string[];
};

type TeamSection = {
	id: string;
	heading: string | null;
	teams: string[];
	showGroup: boolean;
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const UNIT = 88;
const TOTAL = 8 * UNIT;
const CARD_W = 152;
const CONN_W = 14;

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

function groupLetterOf(team: string): string | null {
	for (const [letter, teams] of Object.entries(GROUPS)) {
		if (teams.includes(team)) return letter;
	}
	return null;
}

function parseGroupLetter(label: string | null): string | null {
	if (!label) return null;
	const m = /^Group ([A-L])/.exec(label);
	return m?.[1] ?? null;
}

// Build team sections for the picker modal — kept pure so PickerModal stays simple.
function buildGroupedSections(
	state: PickerState,
	secondaryTeams: string[],
): TeamSection[] {
	const sections: TeamSection[] = [];
	const homeTeams = state.homeGroup ? (GROUPS[state.homeGroup] ?? []) : [];
	const awayTeams = state.awayGroup ? (GROUPS[state.awayGroup] ?? []) : [];
	if (homeTeams.length > 0) {
		sections.push({
			id: "home",
			heading: `Group ${state.homeGroup}`,
			teams: homeTeams,
			showGroup: false,
		});
	}
	if (awayTeams.length > 0) {
		sections.push({
			id: "away",
			heading: `Group ${state.awayGroup}`,
			teams: awayTeams,
			showGroup: false,
		});
	}
	if (secondaryTeams.length > 0) {
		sections.push({
			id: "other",
			heading: "Other teams",
			teams: secondaryTeams,
			showGroup: true,
		});
	}
	return sections;
}

function buildSuggestedSections(
	state: PickerState,
	secondaryTeams: string[],
): TeamSection[] {
	if (state.suggested.length > 0) {
		return [
			{ id: "match", heading: null, teams: state.suggested, showGroup: true },
		];
	}
	if (secondaryTeams.length > 0) {
		return [
			{ id: "other", heading: null, teams: secondaryTeams, showGroup: true },
		];
	}
	return [];
}

function buildSections(
	state: PickerState,
	allTeams: string[],
	search: string,
): TeamSection[] {
	const q = search.toLowerCase();
	if (q.length > 0) {
		const results = allTeams.filter((t) => t.toLowerCase().includes(q));
		return [{ id: "search", heading: null, teams: results, showGroup: true }];
	}
	const isGroupBased = state.homeGroup !== null || state.awayGroup !== null;
	const primaryTeams = isGroupBased
		? [
				...(GROUPS[state.homeGroup ?? ""] ?? []),
				...(GROUPS[state.awayGroup ?? ""] ?? []),
			]
		: state.suggested;
	const secondaryTeams = allTeams.filter((t) => !primaryTeams.includes(t));
	return isGroupBased
		? buildGroupedSections(state, [])
		: buildSuggestedSections(state, secondaryTeams);
}

// ─── TeamRow — extracted to top level (not nested inside picker) ──────────────

function TeamRow({
	matchId,
	team,
	showGroup,
	isCurrent,
	onSelect,
}: Readonly<{
	matchId: string;
	team: string;
	showGroup: boolean;
	isCurrent: boolean;
	onSelect: (matchId: string, team: string) => void;
}>) {
	const group = showGroup ? groupLetterOf(team) : null;
	return (
		<button
			type="button"
			className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors
				${isCurrent ? "bg-accent/20 text-accent" : "hover:bg-surface-2"}`}
			onClick={() => onSelect(matchId, team)}
		>
			<Flag name={team} />
			<span className="flex-1 truncate">{team}</span>
			{group ? (
				<span className="shrink-0 text-[10px] text-foreground-muted">
					Group {group}
				</span>
			) : null}
			{isCurrent ? (
				<span className="shrink-0 text-xs text-accent">✓</span>
			) : null}
		</button>
	);
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal({
	state,
	currentPick,
	allTeams,
	onPick,
	onClear,
	onClose,
}: Readonly<{
	state: PickerState;
	currentPick: string | null;
	allTeams: string[];
	onPick: (matchId: string, team: string) => void;
	onClear: (matchId: string) => void;
	onClose: () => void;
}>) {
	const [search, setSearch] = useState("");
	const sections = buildSections(state, allTeams, search);

	function handleSelect(matchId: string, team: string) {
		onPick(matchId, team);
		onClose();
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop — a real button so click-to-close is accessible */}
			<button
				type="button"
				aria-label="Close picker"
				className="absolute inset-0 bg-background/80 backdrop-blur-sm"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
				}}
			/>
			<dialog
				open
				aria-modal="true"
				className="relative z-10 m-0 flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-foreground"
				onKeyDown={(e) => {
					if (e.key === "Escape") onClose();
					e.stopPropagation();
				}}
			>
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="text-xs text-foreground-muted">Pick winner</p>
						<p className="text-sm font-semibold">
							{state.homeDisplay}{" "}
							<span className="font-normal text-foreground-muted">vs</span>{" "}
							{state.awayDisplay}
						</p>
					</div>
					{currentPick ? (
						<button
							type="button"
							className="mt-0.5 shrink-0 text-xs text-foreground-muted transition-colors hover:text-red-400"
							onClick={() => {
								onClear(state.matchId);
							}}
						>
							Clear
						</button>
					) : null}
				</div>
				<input
					autoFocus
					placeholder="Search teams…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full rounded-lg bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-foreground-muted focus:ring-1 focus:ring-accent/50"
				/>
				<div className="-mx-1 flex max-h-64 flex-col gap-px overflow-y-auto">
					{sections.map((section) => (
						<div key={section.id}>
							{section.heading ? (
								<p className="px-2 pb-0.5 pt-2 text-[10px] uppercase tracking-widest text-foreground-muted first:pt-1">
									{section.heading}
								</p>
							) : null}
							{section.teams.length === 0 && search.length > 0 ? (
								<p className="px-2 py-4 text-center text-sm text-foreground-muted">
									No teams found
								</p>
							) : null}
							{section.teams.map((team) => (
								<TeamRow
									key={team}
									matchId={state.matchId}
									team={team}
									showGroup={section.showGroup}
									isCurrent={team === currentPick}
									onSelect={handleSelect}
								/>
							))}
						</div>
					))}
				</div>
			</dialog>
		</div>
	);
}

// ─── BracketCard ─────────────────────────────────────────────────────────────

function BracketCard({
	match,
	homeDisplay,
	awayDisplay,
	homeGroup,
	awayGroup,
	winner,
	suggested,
	isLocked,
	onPick,
	onOpenPicker,
}: Readonly<{
	match: BMatch;
	homeDisplay: string;
	awayDisplay: string;
	homeGroup: string | null;
	awayGroup: string | null;
	winner: string | null;
	suggested: string[];
	isLocked: boolean;
	onPick: (matchId: string, team: string) => void;
	onOpenPicker: (state: PickerState) => void;
}>) {
	function openPicker(singleGroup?: "home" | "away") {
		onOpenPicker({
			matchId: singleGroup ? `${match.id}:${singleGroup}` : match.id,
			homeDisplay,
			awayDisplay,
			homeGroup: singleGroup === "away" ? null : homeGroup,
			awayGroup: singleGroup === "home" ? null : awayGroup,
			suggested,
		});
	}

	// R32: label rows + inline winner selection (all R32 matches have labels in DB)
	if (match.homeLabel !== null || match.awayLabel !== null) {
		const labelRow = (label: string, side: "home" | "away") => {
			const filled = !isLabel(label);
			const isWinner = winner === label;

			if (isLocked) {
				return (
					<div
						className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${isWinner ? "bg-accent/20 font-semibold text-accent" : "text-foreground-muted"}`}
					>
						{filled ? <Flag name={label} /> : null}
						<span className="flex-1 truncate">{label}</span>
						{isWinner ? <span className="shrink-0 text-accent">✓</span> : null}
					</div>
				);
			}

			if (!filled) {
				return (
					<button
						type="button"
						onClick={() => openPicker(side)}
						className="flex w-full items-start px-2 py-1.5 text-left text-xs text-foreground-muted transition-colors hover:bg-surface-2"
					>
						{label}
					</button>
				);
			}

			return (
				<div
					className={`flex items-center gap-1.5 px-2 py-1.5 text-xs transition-colors ${isWinner ? "bg-accent/20" : "hover:bg-surface-2"}`}
				>
					<button
						type="button"
						onClick={() => onPick(match.id, label)}
						className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${isWinner ? "font-semibold text-accent" : "text-foreground"}`}
					>
						<Flag name={label} />
						<span className="truncate">{label}</span>
						{isWinner ? <span className="shrink-0 text-accent">✓</span> : null}
					</button>
					<button
						type="button"
						onClick={() => openPicker(side)}
						className="shrink-0 text-[10px] text-foreground-muted transition-colors hover:text-foreground"
					>
						Change
					</button>
				</div>
			);
		};

		return (
			<div
				className="overflow-hidden rounded-lg border border-border bg-surface"
				style={{ width: CARD_W }}
			>
				{labelRow(homeDisplay, "home")}
				<div className="h-px bg-border/30" />
				{labelRow(awayDisplay, "away")}
			</div>
		);
	}

	// R16+: click a known team row to pick winner; TBD rows are inert
	const homeSelected = winner === homeDisplay;
	const awaySelected = winner === awayDisplay;
	const homeTBD = isLabel(homeDisplay);
	const awayTBD = isLabel(awayDisplay);

	const teamRow = (display: string, selected: boolean, tbd: boolean) => (
		<button
			type="button"
			disabled={tbd || isLocked}
			onClick={() => onPick(match.id, display)}
			className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs transition-colors disabled:cursor-default
				${selected ? "bg-accent/20 font-semibold text-accent" : tbd ? "text-foreground-muted opacity-40" : isLocked ? "text-foreground-muted" : "text-foreground hover:bg-surface-2"}`}
		>
			{!tbd ? <Flag name={display} /> : null}
			<span className="flex-1 truncate">{display}</span>
			{selected ? <span className="shrink-0 text-accent">✓</span> : null}
		</button>
	);

	return (
		<div
			className="overflow-hidden rounded-lg border border-border bg-surface"
			style={{ width: CARD_W }}
		>
			{teamRow(homeDisplay, homeSelected, homeTBD)}
			<div className="h-px bg-border/30" />
			{teamRow(awayDisplay, awaySelected, awayTBD)}
		</div>
	);
}

// ─── Connector strips ─────────────────────────────────────────────────────────

function LeftConnector({ pairs }: Readonly<{ pairs: number }>) {
	const flexPer = 8 / pairs;
	const keys = Array.from({ length: pairs }, (_, i) => `lc-${i}`);
	return (
		<div className="flex flex-col" style={{ height: TOTAL, width: CONN_W }}>
			{keys.map((k) => (
				<div key={k} className="flex flex-col" style={{ flex: flexPer * 2 }}>
					<div className="flex-1 rounded-br border-b-2 border-r-2 border-border/40" />
					<div className="flex-1 rounded-tr border-r-2 border-t-2 border-border/40" />
				</div>
			))}
		</div>
	);
}

function RightConnector({ pairs }: Readonly<{ pairs: number }>) {
	const flexPer = 8 / pairs;
	const keys = Array.from({ length: pairs }, (_, i) => `rc-${i}`);
	return (
		<div className="flex flex-col" style={{ height: TOTAL, width: CONN_W }}>
			{keys.map((k) => (
				<div key={k} className="flex flex-col" style={{ flex: flexPer * 2 }}>
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

function BracketColumn({
	cards,
	unitPer,
	picks,
	isLocked,
	onPick,
	onOpenPicker,
}: Readonly<{
	cards: CardInfo[];
	unitPer: number;
	picks: Record<string, string>;
	isLocked: boolean;
	onPick: (matchId: string, team: string) => void;
	onOpenPicker: (state: PickerState) => void;
}>) {
	return (
		<div className="flex flex-col" style={{ height: TOTAL }}>
			{cards.map(
				({
					match,
					homeDisplay,
					awayDisplay,
					homeGroup,
					awayGroup,
					suggested,
				}) => (
					<div
						key={match.id}
						className="flex items-center justify-center"
						style={{ flex: unitPer }}
					>
						<BracketCard
							match={match}
							homeDisplay={homeDisplay}
							awayDisplay={awayDisplay}
							homeGroup={homeGroup}
							awayGroup={awayGroup}
							winner={picks[match.id] ?? null}
							suggested={suggested}
							isLocked={isLocked}
							onPick={onPick}
							onOpenPicker={onOpenPicker}
						/>
					</div>
				),
			)}
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
	const [slotPicks, setSlotPicks] = useState<
		Record<string, { home?: string; away?: string }>
	>({});
	const [dirty, setDirty] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [picker, setPicker] = useState<PickerState | null>(null);
	const [pending, startTransition] = useTransition();

	function handlePick(key: string, team: string) {
		if (key.endsWith(":home") || key.endsWith(":away")) {
			const [matchId, side] = key.split(":");
			setSlotPicks((prev) => ({
				...prev,
				[matchId]: { ...prev[matchId], [side]: team },
			}));
		} else {
			setPicks((prev) => ({ ...prev, [key]: team }));
			setDirty(true);
		}
	}

	function handleClearPick(key: string) {
		if (key.endsWith(":home") || key.endsWith(":away")) {
			const [matchId, side] = key.split(":");
			setSlotPicks((prev) => {
				const next = { ...prev };
				if (next[matchId]) {
					next[matchId] = { ...next[matchId] };
					delete next[matchId][side as "home" | "away"];
				}
				return next;
			});
		} else {
			setPicks((prev) => {
				const next = { ...prev };
				delete next[key];
				return next;
			});
			setDirty(true);
		}
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

	function r32Card(i: number): CardInfo {
		const m = r32[i];
		const slots = slotPicks[m.id];
		const home = slots?.home ?? effectiveTeam(m.homeTeam, m.homeLabel);
		const away = slots?.away ?? effectiveTeam(m.awayTeam, m.awayLabel);
		return {
			match: m,
			homeDisplay: home,
			awayDisplay: away,
			homeGroup: parseGroupLetter(m.homeLabel),
			awayGroup: parseGroupLetter(m.awayLabel),
			suggested: [
				...new Set([
					...(slots?.home ? [slots.home] : teamsForLabel(m.homeLabel)),
					...(slots?.away ? [slots.away] : teamsForLabel(m.awayLabel)),
				]),
			],
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
			homeDisplay: home,
			awayDisplay: away,
			homeGroup: null,
			awayGroup: null,
			suggested: suggested.length > 0 ? suggested : allTeams,
		};
	}

	const leftR32 = Array.from({ length: 8 }, (_, i) => r32Card(i));
	const rightR32 = Array.from({ length: 8 }, (_, i) => r32Card(i + 8));
	const leftR16 = Array.from({ length: 4 }, (_, i) => higherCard(r16, r32, i));
	const rightR16 = Array.from({ length: 4 }, (_, i) =>
		higherCard(r16, r32, i + 4),
	);
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
			<div className="overflow-x-auto pb-4">
				<div className="flex items-start" style={{ minWidth: "max-content" }}>
					<BracketColumn
						cards={leftR32}
						unitPer={1}
						picks={picks}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<LeftConnector pairs={4} />
					<BracketColumn
						cards={leftR16}
						unitPer={2}
						picks={picks}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<LeftConnector pairs={2} />
					<BracketColumn
						cards={leftQF}
						unitPer={4}
						picks={picks}
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
							isLocked={isLocked}
							onPick={handlePick}
							onOpenPicker={setPicker}
						/>
					) : null}
					<HorizLine side="left" />
					{finalCards.length > 0 ? (
						<BracketColumn
							cards={finalCards}
							unitPer={8}
							picks={picks}
							isLocked={isLocked}
							onPick={handlePick}
							onOpenPicker={setPicker}
						/>
					) : null}
					<HorizLine side="right" />
					{rightSF.length > 0 ? (
						<BracketColumn
							cards={rightSF}
							unitPer={8}
							picks={picks}
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
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<RightConnector pairs={2} />
					<BracketColumn
						cards={rightR16}
						unitPer={2}
						picks={picks}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
					<RightConnector pairs={4} />
					<BracketColumn
						cards={rightR32}
						unitPer={1}
						picks={picks}
						isLocked={isLocked}
						onPick={handlePick}
						onOpenPicker={setPicker}
					/>
				</div>
			</div>

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

			{picker ? (
				<PickerModal
					state={picker}
					currentPick={(() => {
						if (picker.matchId.endsWith(":home")) {
							return slotPicks[picker.matchId.slice(0, -5)]?.home ?? null;
						}
						if (picker.matchId.endsWith(":away")) {
							return slotPicks[picker.matchId.slice(0, -5)]?.away ?? null;
						}
						return picks[picker.matchId] ?? null;
					})()}
					allTeams={allTeams}
					onPick={handlePick}
					onClear={handleClearPick}
					onClose={() => setPicker(null)}
				/>
			) : null}
		</div>
	);
}
