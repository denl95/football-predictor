export const STAGE_POINTS: Record<string, number> = {
	ROUND_OF_32: 1,
	ROUND_OF_16: 2,
	QUARTER_FINAL: 3,
	SEMI_FINAL: 5,
	FINAL: 8,
	CHAMPION: 12,
};

// Bracket slot labels for R32 matches (externalId → [homeLabel, awayLabel]).
// Derived from the official FIFA 2026 routing and verified against resolved teams
// (e.g. 537417 = South Africa/Canada = Runner-up A vs Runner-up B). Used by both
// the seed and the cron sync so a match created/updated by either gets correct
// slot labels. The comment notes the official FIFA match number.
export const R32_LABELS: Record<string, [string, string]> = {
	"537417": ["Group A Runner-up", "Group B Runner-up"], // M73
	"537415": ["Group E Winner", "Best 3rd Place (ABCDF)"], // M74
	"537418": ["Group F Winner", "Group C Runner-up"], // M75
	"537423": ["Group C Winner", "Group F Runner-up"], // M76
	"537416": ["Group I Winner", "Best 3rd Place (CDFGH)"], // M77
	"537424": ["Group E Runner-up", "Group I Runner-up"], // M78
	"537425": ["Group A Winner", "Best 3rd Place (CEFHI)"], // M79
	"537426": ["Group L Winner", "Best 3rd Place (EHIJK)"], // M80
	"537421": ["Group D Winner", "Best 3rd Place (BEFIJ)"], // M81
	"537422": ["Group G Winner", "Best 3rd Place (AEHIJ)"], // M82
	"537419": ["Group K Runner-up", "Group L Runner-up"], // M83
	"537420": ["Group H Winner", "Group J Runner-up"], // M84
	"537429": ["Group B Winner", "Best 3rd Place (EFGIJ)"], // M85
	"537427": ["Group J Winner", "Group H Runner-up"], // M86
	"537430": ["Group K Winner", "Best 3rd Place (DEIJL)"], // M87
	"537428": ["Group D Runner-up", "Group G Runner-up"], // M88
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
