"use client";

import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const LINE_COLORS = [
	"#10b981", // accent green
	"#f59e0b", // gold
	"#60a5fa", // blue
	"#f472b6", // pink
	"#a78bfa", // purple
	"#fb923c", // orange
	"#34d399", // teal
	"#e879f9", // fuchsia
];

type DataPoint = Record<string, number | string>;

type Props = {
	readonly data: DataPoint[];
	readonly players: string[];
};

export function LeaderboardChart({ data, players }: Props) {
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
					<Tooltip
						contentStyle={{
							backgroundColor: "#1f2937",
							border: "1px solid #374151",
							borderRadius: "12px",
							color: "#f9fafb",
							fontSize: 13,
						}}
						itemStyle={{ color: "#f9fafb" }}
						labelStyle={{ color: "#9ca3af", marginBottom: 4 }}
					/>
					<Legend
						wrapperStyle={{ fontSize: 12, color: "#9ca3af", paddingTop: 12 }}
					/>
					{players.map((name, i) => (
						<Line
							key={name}
							type="monotone"
							dataKey={name}
							stroke={LINE_COLORS[i % LINE_COLORS.length]}
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
