"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { BarShapeProps } from "recharts";

const COLORS = [
	"#10b981", // accent green
	"#f59e0b", // gold
	"#60a5fa", // blue
	"#f472b6", // pink
	"#a78bfa", // purple
	"#fb923c", // orange
	"#34d399", // teal
	"#e879f9", // fuchsia
];

const TOOLTIP = {
	contentStyle: {
		backgroundColor: "#1f2937",
		border: "1px solid #374151",
		borderRadius: "12px",
		color: "#f9fafb",
		fontSize: 13,
	},
	itemStyle: { color: "#f9fafb" },
	labelStyle: { color: "#9ca3af", marginBottom: 4 },
};

function ColoredBar(props: BarShapeProps) {
	const { x, y, width, height, index } = props;
	if (!width || !height) return null;
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			rx={6}
			fill={COLORS[index % COLORS.length]}
		/>
	);
}

// ── Bar chart ────────────────────────────────────────────────────────────────

export type BarEntry = { name: string; points: number };

export function PointsBarChart({ data }: { readonly data: BarEntry[] }) {
	if (data.length === 0) return null;

	return (
		<div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
				Current standings
			</h2>
			<ResponsiveContainer width="100%" height={200}>
				<BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
					<XAxis
						dataKey="name"
						tick={{ fill: "#9ca3af", fontSize: 12 }}
						tickLine={false}
						axisLine={{ stroke: "#374151" }}
					/>
					<YAxis
						tick={{ fill: "#9ca3af", fontSize: 11 }}
						tickLine={false}
						axisLine={false}
						allowDecimals={false}
					/>
					<Tooltip {...TOOLTIP} cursor={{ fill: "#374151", opacity: 0.4 }} />
					<Bar dataKey="points" shape={ColoredBar} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

// ── Line chart ───────────────────────────────────────────────────────────────

type LineDataPoint = Record<string, number | string>;

export function LeaderboardChart({
	data,
	players,
}: {
	readonly data: LineDataPoint[];
	readonly players: string[];
}) {
	if (data.length === 0) return null;

	return (
		<div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
				Points over time
			</h2>
			<ResponsiveContainer width="100%" height={280}>
				<LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
					<XAxis
						dataKey="date"
						tick={{ fill: "#9ca3af", fontSize: 11 }}
						tickLine={false}
						axisLine={{ stroke: "#374151" }}
					/>
					<YAxis
						tick={{ fill: "#9ca3af", fontSize: 11 }}
						tickLine={false}
						axisLine={false}
						allowDecimals={false}
					/>
					<Tooltip {...TOOLTIP} />
					<Legend
						wrapperStyle={{ fontSize: 12, color: "#9ca3af", paddingTop: 12 }}
					/>
					{players.map((name, i) => (
						<Line
							key={name}
							type="monotone"
							dataKey={name}
							stroke={COLORS[i % COLORS.length]}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
