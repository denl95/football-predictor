export const TOTAL = "calc(8 * var(--bk-unit))";
export const CARD_W = "var(--bk-card)";
export const CONN_W = "var(--bk-conn)";

/** Condense "Best 3rd Place (ABCDF)" → "Best 3rd (A/B/C/D/F)" for card UI. */
export function displayLabel(label: string): string {
	const m = /^Best 3rd Place \(([A-L]+)\)$/.exec(label);
	if (!m) return label;
	return `Best 3rd (${[...m[1]].join("/")})`;
}

export function LeftConnector({ pairs }: Readonly<{ pairs: number }>) {
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

export function RightConnector({ pairs }: Readonly<{ pairs: number }>) {
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

export function HorizLine({ side }: Readonly<{ side: "left" | "right" }>) {
	return (
		<div
			className={`flex items-center ${side === "right" ? "justify-end" : ""}`}
			style={{ height: TOTAL, width: CONN_W }}
		>
			<div className="h-0.5 w-full bg-border/40" />
		</div>
	);
}
