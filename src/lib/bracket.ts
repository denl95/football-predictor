export const STAGE_POINTS: Record<string, number> = {
	ROUND_OF_32: 1,
	ROUND_OF_16: 2,
	QUARTER_FINAL: 4,
	SEMI_FINAL: 8,
	FINAL: 20,
};

export const STAGE_LABEL: Record<string, string> = {
	ROUND_OF_32: "Round of 32",
	ROUND_OF_16: "Round of 16",
	QUARTER_FINAL: "Quarter-finals",
	SEMI_FINAL: "Semi-finals",
	FINAL: "Final",
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

/** "Group A Winner" | "Group C Runner-up" → all 4 teams in that group as candidates */
export function teamsForLabel(label: string | null | undefined): string[] {
	if (!label) return [];
	const m = /^Group ([A-L]) (?:Winner|Runner-up)$/.exec(label);
	if (m) return GROUPS[m[1]] ?? [];
	return [];
}
