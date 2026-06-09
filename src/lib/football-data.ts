export type FDMatch = {
	id: number;
	utcDate: string;
	status: string;
	stage: string;
	group: string | null;
	homeTeam: { name: string | null };
	awayTeam: { name: string | null };
	score: {
		fullTime: { home: number | null; away: number | null };
	};
};

type FDMatchesResponse = {
	matches: FDMatch[];
};

export type FDPlayer = {
	id: number;
	name: string;
	position: "Goalkeeper" | "Defence" | "Midfield" | "Offence";
	dateOfBirth: string;
	nationality: string;
};

export type FDTeamDetail = {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
	coach: { name: string; dateOfBirth: string | null; nationality: string } | null;
	squad: FDPlayer[];
};

export async function fetchWCTeam(teamName: string): Promise<FDTeamDetail | null> {
	const apiKey = process.env.FOOTBALL_DATA_API_KEY;
	if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set");

	const res = await fetch(
		"https://api.football-data.org/v4/competitions/WC/teams",
		{
			headers: { "X-Auth-Token": apiKey },
			next: { revalidate: 3600 },
		},
	);
	if (!res.ok) throw new Error(`football-data.org responded ${res.status}`);

	const data = (await res.json()) as { teams: FDTeamDetail[] };
	return data.teams.find((t) => t.name === teamName) ?? null;
}

export async function fetchWCMatches(): Promise<FDMatch[]> {
	const apiKey = process.env.FOOTBALL_DATA_API_KEY;
	if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set");

	const res = await fetch(
		"https://api.football-data.org/v4/competitions/WC/matches",
		{ headers: { "X-Auth-Token": apiKey } },
	);
	if (!res.ok) {
		throw new Error(
			`football-data.org responded ${res.status}: ${await res.text()}`,
		);
	}
	const data = (await res.json()) as FDMatchesResponse;
	return data.matches;
}

// football-data.org stage → MatchStage enum value
export const STAGE_MAP: Record<string, string> = {
	GROUP_STAGE: "GROUP",
	ROUND_OF_32: "ROUND_OF_32",
	LAST_32: "ROUND_OF_32",
	ROUND_OF_16: "ROUND_OF_16",
	LAST_16: "ROUND_OF_16",
	QUARTER_FINALS: "QUARTER_FINAL",
	SEMI_FINALS: "SEMI_FINAL",
	FINAL: "FINAL",
};

// football-data.org status → MatchStatus enum value
export const STATUS_MAP: Record<string, string> = {
	SCHEDULED: "UPCOMING",
	TIMED: "UPCOMING",
	IN_PLAY: "LIVE",
	PAUSED: "LIVE",
	FINISHED: "FINISHED",
	AWARDED: "FINISHED",
};

// Country name (as returned by football-data.org) → ISO 3166-1 alpha-2 code
export const FLAG_CODE_MAP: Record<string, string> = {
	// Hosts
	"United States": "us",
	Canada: "ca",
	Mexico: "mx",
	// South America
	Argentina: "ar",
	Brazil: "br",
	Uruguay: "uy",
	Colombia: "co",
	Ecuador: "ec",
	Chile: "cl",
	Venezuela: "ve",
	Paraguay: "py",
	Peru: "pe",
	Bolivia: "bo",
	// Europe
	France: "fr",
	Spain: "es",
	Germany: "de",
	Portugal: "pt",
	England: "gb-eng",
	Netherlands: "nl",
	Belgium: "be",
	Croatia: "hr",
	Denmark: "dk",
	Switzerland: "ch",
	Serbia: "rs",
	Poland: "pl",
	Austria: "at",
	Turkey: "tr",
	Türkiye: "tr",
	Scotland: "gb-sct",
	Ukraine: "ua",
	Hungary: "hu",
	Czechia: "cz",
	"Czech Republic": "cz",
	Slovakia: "sk",
	Slovenia: "si",
	Romania: "ro",
	Albania: "al",
	Wales: "gb-wls",
	Greece: "gr",
	Norway: "no",
	Sweden: "se",
	Finland: "fi",
	Iceland: "is",
	Georgia: "ge",
	Kosovo: "xk",
	"North Macedonia": "mk",
	Montenegro: "me",
	"Bosnia and Herzegovina": "ba",
	// Africa
	Morocco: "ma",
	Senegal: "sn",
	Nigeria: "ng",
	Egypt: "eg",
	Cameroon: "cm",
	"Ivory Coast": "ci",
	"Côte d'Ivoire": "ci",
	"South Africa": "za",
	Mali: "ml",
	"DR Congo": "cd",
	Tunisia: "tn",
	Algeria: "dz",
	Ghana: "gh",
	Tanzania: "tz",
	Zambia: "zm",
	"Cape Verde": "cv",
	Benin: "bj",
	Gabon: "ga",
	Congo: "cg",
	Zimbabwe: "zw",
	"Burkina Faso": "bf",
	"Equatorial Guinea": "gq",
	Comoros: "km",
	Mozambique: "mz",
	// Asia
	Japan: "jp",
	"Korea Republic": "kr",
	"South Korea": "kr",
	Australia: "au",
	Iran: "ir",
	"Saudi Arabia": "sa",
	Qatar: "qa",
	Iraq: "iq",
	Jordan: "jo",
	Uzbekistan: "uz",
	"China PR": "cn",
	China: "cn",
	Oman: "om",
	Bahrain: "bh",
	"United Arab Emirates": "ae",
	Kuwait: "kw",
	India: "in",
	// CONCACAF (non-hosts)
	"Costa Rica": "cr",
	Honduras: "hn",
	Jamaica: "jm",
	Panama: "pa",
	"El Salvador": "sv",
	Guatemala: "gt",
	Haiti: "ht",
	"Trinidad and Tobago": "tt",
	Cuba: "cu",
	// Oceania
	"New Zealand": "nz",
	// Alternate spellings / abbreviations used by football-data.org
	"Bosnia-Herzegovina": "ba",
	"Cape Verde Islands": "cv",
	"Congo DR": "cd",
	Curaçao: "cw",
	Curacao: "cw",
	// Other
	Israel: "il",
};

export function toFlagCode(name: string | null): string | null {
	if (!name) return null;
	return FLAG_CODE_MAP[name] ?? null;
}

export function toStage(fdStage: string): string {
	return STAGE_MAP[fdStage] ?? "GROUP";
}

export function toStatus(fdStatus: string): string {
	return STATUS_MAP[fdStatus] ?? "UPCOMING";
}

/** "GROUP_A" → "Group A", null → null */
export function toGroupLabel(fdGroup: string | null): string | null {
	if (!fdGroup) return null;
	return fdGroup.replace("GROUP_", "Group ");
}
