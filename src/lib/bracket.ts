export const STAGE_POINTS: Record<string, number> = {
	ROUND_OF_32: 1,
	ROUND_OF_16: 2,
	QUARTER_FINAL: 3,
	SEMI_FINAL: 5,
	FINAL: 8,
	CHAMPION: 12,
};

export const STAGE_LABEL: Record<string, string> = {
	ROUND_OF_32: "Round of 32",
	ROUND_OF_16: "Round of 16",
	QUARTER_FINAL: "Quarter-finals",
	SEMI_FINAL: "Semi-finals",
	FINAL: "Finalist",
	CHAMPION: "Champion",
};

// Groups from the WC 2026 draw
export const GROUPS: Record<string, string[]> = {
	A: ["Mexico", "Czechia", "South Africa", "South Korea"],
	B: ["Canada", "Bosnia-Herzegovina", "Qatar", "Switzerland"],
	C: ["Brazil", "Morocco", "Haiti", "Scotland"],
	D: ["United States", "Turkey", "Paraguay", "Australia"],
	E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
	F: ["Sweden", "Netherlands", "Japan", "Tunisia"],
	G: ["Belgium", "Egypt", "Iran", "New Zealand"],
	H: ["Spain", "Cape Verde Islands", "Saudi Arabia", "Uruguay"],
	I: ["France", "Iraq", "Senegal", "Norway"],
	J: ["Argentina", "Algeria", "Austria", "Jordan"],
	K: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
	L: ["England", "Croatia", "Ghana", "Panama"],
};

// Canonical bracket-position order, keyed by football-data.org externalId.
// The knockout bracket is laid out by BRACKET POSITION, not kick-off time. This
// matches the official NYT/Athletic & FIFA bracket layout, which lists the Round of
// 32 by match id numerically (537415→537430) — putting the Group E winner vs Group I
// winner match (Germany vs France) at the top. R16/QF/SF are ordered so each slot is
// fed by the adjacent pair in the previous round (per FIFA routing M89=W74vW77, …).
// Within each round index 0..n is top-to-bottom (left half then right half).
export const BRACKET_ORDER: Record<string, readonly string[]> = {
	ROUND_OF_32: [
		"537415",
		"537416",
		"537417",
		"537418",
		"537419",
		"537420",
		"537421",
		"537422",
		"537423",
		"537424",
		"537425",
		"537426",
		"537427",
		"537428",
		"537429",
		"537430",
	],
	ROUND_OF_16: [
		"537375",
		"537376",
		"537379",
		"537380",
		"537377",
		"537378",
		"537381",
		"537382",
	],
	QUARTER_FINAL: ["537383", "537384", "537385", "537386"],
	SEMI_FINAL: ["537387", "537388"],
};

// Order knockout matches by their fixed bracket position. Matches whose externalId
// isn't in the canonical list (or null) fall back to scheduledAt, so the layout
// degrades gracefully if the upstream IDs ever change.
export function orderByBracketPosition<
	T extends { externalId: string | null; scheduledAt: Date },
>(matches: T[], stage: string): T[] {
	const order = BRACKET_ORDER[stage];
	if (!order) return matches;
	const rank = (id: string | null) => {
		const i = id ? order.indexOf(id) : -1;
		return i === -1 ? Number.MAX_SAFE_INTEGER : i;
	};
	return [...matches].sort((a, b) => {
		const d = rank(a.externalId) - rank(b.externalId);
		return d !== 0 ? d : a.scheduledAt.getTime() - b.scheduledAt.getTime();
	});
}

/** Returns the candidate teams for a bracket slot label:
 *  "Group A Winner" | "Group C Runner-up" → 4 teams from that group.
 *  "Best 3rd Place (ABCDF)" → teams from those specific groups only.
 *  "Best 3rd Place" (legacy) → all teams. */
export function teamsForLabel(label: string | null | undefined): string[] {
	if (!label) return [];
	const third = /^Best 3rd Place \(([A-L]+)\)$/.exec(label);
	if (third) return [...third[1]].flatMap((l) => GROUPS[l] ?? []);
	if (label === "Best 3rd Place") return Object.values(GROUPS).flat();
	const m = /^Group ([A-L]) (?:Winner|Runner-up)$/.exec(label);
	if (m) return GROUPS[m[1]] ?? [];
	return [];
}
