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

// Country name (as returned by football-data.org) → flag emoji
export const FLAG_MAP: Record<string, string> = {
	// Hosts
	"United States": "🇺🇸",
	Canada: "🇨🇦",
	Mexico: "🇲🇽",
	// South America
	Argentina: "🇦🇷",
	Brazil: "🇧🇷",
	Uruguay: "🇺🇾",
	Colombia: "🇨🇴",
	Ecuador: "🇪🇨",
	Chile: "🇨🇱",
	Venezuela: "🇻🇪",
	Paraguay: "🇵🇾",
	Peru: "🇵🇪",
	Bolivia: "🇧🇴",
	// Europe
	France: "🇫🇷",
	Spain: "🇪🇸",
	Germany: "🇩🇪",
	Portugal: "🇵🇹",
	England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
	Netherlands: "🇳🇱",
	Belgium: "🇧🇪",
	Croatia: "🇭🇷",
	Denmark: "🇩🇰",
	Switzerland: "🇨🇭",
	Serbia: "🇷🇸",
	Poland: "🇵🇱",
	Austria: "🇦🇹",
	Turkey: "🇹🇷",
	Türkiye: "🇹🇷",
	Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
	Ukraine: "🇺🇦",
	Hungary: "🇭🇺",
	Czechia: "🇨🇿",
	"Czech Republic": "🇨🇿",
	Slovakia: "🇸🇰",
	Slovenia: "🇸🇮",
	Romania: "🇷🇴",
	Albania: "🇦🇱",
	Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
	Greece: "🇬🇷",
	Norway: "🇳🇴",
	Sweden: "🇸🇪",
	Finland: "🇫🇮",
	Iceland: "🇮🇸",
	Georgia: "🇬🇪",
	Kosovo: "🇽🇰",
	"North Macedonia": "🇲🇰",
	Montenegro: "🇲🇪",
	"Bosnia and Herzegovina": "🇧🇦",
	// Africa
	Morocco: "🇲🇦",
	Senegal: "🇸🇳",
	Nigeria: "🇳🇬",
	Egypt: "🇪🇬",
	Cameroon: "🇨🇲",
	"Ivory Coast": "🇨🇮",
	"Côte d'Ivoire": "🇨🇮",
	"South Africa": "🇿🇦",
	Mali: "🇲🇱",
	"DR Congo": "🇨🇩",
	Tunisia: "🇹🇳",
	Algeria: "🇩🇿",
	Ghana: "🇬🇭",
	Tanzania: "🇹🇿",
	Zambia: "🇿🇲",
	"Cape Verde": "🇨🇻",
	Benin: "🇧🇯",
	Gabon: "🇬🇦",
	Congo: "🇨🇬",
	Zimbabwe: "🇿🇼",
	"Burkina Faso": "🇧🇫",
	"Equatorial Guinea": "🇬🇶",
	Comoros: "🇰🇲",
	Mozambique: "🇲🇿",
	// Asia
	Japan: "🇯🇵",
	"Korea Republic": "🇰🇷",
	"South Korea": "🇰🇷",
	Australia: "🇦🇺",
	Iran: "🇮🇷",
	"Saudi Arabia": "🇸🇦",
	Qatar: "🇶🇦",
	Iraq: "🇮🇶",
	Jordan: "🇯🇴",
	Uzbekistan: "🇺🇿",
	"China PR": "🇨🇳",
	China: "🇨🇳",
	Oman: "🇴🇲",
	Bahrain: "🇧🇭",
	"United Arab Emirates": "🇦🇪",
	Kuwait: "🇰🇼",
	India: "🇮🇳",
	// CONCACAF (non-hosts)
	"Costa Rica": "🇨🇷",
	Honduras: "🇭🇳",
	Jamaica: "🇯🇲",
	Panama: "🇵🇦",
	"El Salvador": "🇸🇻",
	Guatemala: "🇬🇹",
	Haiti: "🇭🇹",
	"Trinidad and Tobago": "🇹🇹",
	Cuba: "🇨🇺",
	// Oceania
	"New Zealand": "🇳🇿",
	// Alternate spellings / abbreviations used by football-data.org
	"Bosnia-Herzegovina": "🇧🇦",
	"Cape Verde Islands": "🇨🇻",
	"Congo DR": "🇨🇩",
	Curaçao: "🇨🇼",
	Curacao: "🇨🇼",
	// Other
	Israel: "🇮🇱",
};

export function toFlag(name: string | null): string {
	if (!name) return "🏳";
	return FLAG_MAP[name] ?? "🏳";
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
