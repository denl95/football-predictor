"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Flag } from "@/components/Flag";
import { LocalDateTime } from "@/components/LocalDateTime";

export type SerializedMatch = {
	id: string;
	homeTeam: string;
	awayTeam: string;
	group: string | null;
	stage: string;
	status: "UPCOMING" | "LIVE" | "FINISHED";
	scheduledAt: string; // ISO 8601
	homeScore: number | null;
	awayScore: number | null;
	prediction?: {
		homeScore: number;
		awayScore: number;
		points: number | null;
	} | null;
};

const CARD_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
};

const DAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
	weekday: "short",
	day: "numeric",
	month: "short",
};

function localDayKey(iso: string): string {
	// "2026-06-14" in the viewer's local timezone — used as the group key.
	const d = new Date(iso);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function getStatusBadge(
	status: SerializedMatch["status"],
	hasStarted: boolean,
) {
	if (status === "FINISHED")
		return (
			<span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-foreground-muted">
				FT
			</span>
		);
	// Show LIVE when the DB says LIVE, or when scheduled time has passed but the
	// cron hasn't updated status yet (cron runs every ~15 min).
	if (status === "LIVE" || hasStarted)
		return (
			<span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
				LIVE
			</span>
		);
	return null;
}

function MatchCard({ match }: { match: SerializedMatch }) {
	const pred = match.prediction;
	const isFinished = match.status === "FINISHED";
	// Time-based started check so the card updates once kickoff passes,
	// even if the cron hasn't flipped the status yet.
	const hasStarted =
		match.status !== "UPCOMING" || new Date(match.scheduledAt) <= new Date();
	const isLive = hasStarted && match.status !== "FINISHED";
	const showScore =
		(isFinished || hasStarted) &&
		match.homeScore !== null &&
		match.awayScore !== null;

	return (
		<Link
			href={`/matches/${match.id}`}
			className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
		>
			<div className="flex items-center justify-between text-xs text-foreground-muted">
				<span>{match.group}</span>
				<div className="flex items-center gap-2">
					{getStatusBadge(match.status, hasStarted)}
					<LocalDateTime
						iso={match.scheduledAt}
						fallback={new Date(match.scheduledAt).toLocaleString(
							"en-GB",
							CARD_TIME_OPTIONS,
						)}
						options={CARD_TIME_OPTIONS}
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-2">
					<Flag name={match.homeTeam} />
					<span className="font-semibold">{match.homeTeam}</span>
				</div>

				<div className="flex flex-col items-center gap-1">
					{showScore ? (
						<div
							className={`rounded-lg px-4 py-1 text-xl font-bold tabular-nums ${isLive ? "bg-red-500/20 text-red-400" : "bg-surface-2"}`}
						>
							{match.homeScore} – {match.awayScore}
						</div>
					) : (
						<div className="rounded-lg border border-border px-4 py-1 text-sm font-medium text-foreground-muted">
							vs
						</div>
					)}
				</div>

				<div className="flex flex-1 items-center justify-end gap-2">
					<span className="font-semibold">{match.awayTeam}</span>
					<Flag name={match.awayTeam} />
				</div>
			</div>

			{pred ? (
				<div className="flex items-center justify-between border-t border-border pt-2 text-xs">
					<span className="text-foreground-muted">
						Your prediction:{" "}
						<span className="font-semibold text-foreground">
							{pred.homeScore} – {pred.awayScore}
						</span>
					</span>
					{pred.points !== null && pred.points !== undefined && (
						<span
							className={`font-bold ${pred.points === 3 ? "text-gold" : pred.points >= 1 ? "text-accent" : "text-red-400"}`}
						>
							{pred.points} pts
						</span>
					)}
				</div>
			) : null}

			{!pred && match.status === "UPCOMING" ? (
				<div className="border-t border-border pt-2 text-xs text-accent">
					+ Add prediction
				</div>
			) : null}
		</Link>
	);
}

function groupByKey(
	matches: SerializedMatch[],
	byDay: boolean,
): Map<string, SerializedMatch[]> {
	const map = new Map<string, SerializedMatch[]>();
	for (const m of matches) {
		const key = byDay ? localDayKey(m.scheduledAt) : (m.group ?? m.stage);
		const bucket = map.get(key);
		if (bucket) bucket.push(m);
		else map.set(key, [m]);
	}
	return map;
}

function GroupedSection({
	grouped,
	byDay,
}: Readonly<{ grouped: Map<string, SerializedMatch[]>; byDay: boolean }>) {
	return (
		<>
			{Array.from(grouped.entries()).map(([key, group]) => (
				<section key={key} className="flex flex-col gap-3">
					<h2 className="text-sm font-semibold uppercase tracking-widest text-foreground-muted">
						{byDay
							? new Date(key).toLocaleDateString("en-GB", DAY_LABEL_OPTIONS)
							: key}
					</h2>
					<div className="grid gap-3 sm:grid-cols-2">
						{group.map((m) => (
							<MatchCard key={m.id} match={m} />
						))}
					</div>
				</section>
			))}
		</>
	);
}

export function MatchList({
	matches,
	byDay,
	isResults = false,
}: Readonly<{
	matches: SerializedMatch[];
	byDay: boolean;
	isResults?: boolean;
}>) {
	// Results view: server already filtered+sorted descending; group by local day.
	// Default view: show upcoming+live only (finished removed), grouped by day/group.
	const filtered = useMemo(() => {
		if (isResults) return matches.filter((m) => m.status === "FINISHED");
		return matches.filter((m) => m.status !== "FINISHED");
	}, [matches, isResults]);

	const grouped = useMemo(
		() => groupByKey(filtered, byDay || isResults),
		[filtered, byDay, isResults],
	);

	if (isResults) {
		return (
			<div className="flex flex-col gap-6">
				{grouped.size === 0 ? (
					<p className="text-sm text-foreground-muted">
						No finished matches yet.
					</p>
				) : (
					<GroupedSection grouped={grouped} byDay />
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<GroupedSection grouped={grouped} byDay={byDay} />
		</div>
	);
}
