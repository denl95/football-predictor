"use client";

import { useActionState } from "react";
import { type PredictionState, upsertPrediction } from "@/actions/predictions";

interface Props {
	matchId: string;
	initialHome?: number;
	initialAway?: number;
}

export function PredictionForm({ matchId, initialHome, initialAway }: Props) {
	const [state, action, isPending] = useActionState<
		PredictionState | null,
		FormData
	>(upsertPrediction, null);

	return (
		<form action={action} className="flex flex-col gap-4">
			<input type="hidden" name="matchId" value={matchId} />

			<div className="flex items-center justify-center gap-6">
				<div className="flex flex-col items-center gap-2">
					<label className="text-xs text-foreground-muted">Home</label>
					<input
						type="number"
						name="homeScore"
						min={0}
						max={20}
						defaultValue={initialHome ?? ""}
						required
						className="h-14 w-20 rounded-xl border border-border bg-surface-2 text-center text-2xl font-bold tabular-nums focus:border-accent focus:outline-none"
					/>
				</div>

				<span className="text-2xl font-bold text-foreground-muted">–</span>

				<div className="flex flex-col items-center gap-2">
					<label className="text-xs text-foreground-muted">Away</label>
					<input
						type="number"
						name="awayScore"
						min={0}
						max={20}
						defaultValue={initialAway ?? ""}
						required
						className="h-14 w-20 rounded-xl border border-border bg-surface-2 text-center text-2xl font-bold tabular-nums focus:border-accent focus:outline-none"
					/>
				</div>
			</div>

			{state && !state.success && (
				<p className="text-center text-sm text-red-400">{state.error}</p>
			)}

			{state?.success && (
				<p className="text-center text-sm text-accent">Prediction saved ✓</p>
			)}

			<button
				type="submit"
				disabled={isPending}
				className="rounded-xl bg-accent px-6 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{isPending ? "Saving…" : "Save prediction"}
			</button>
		</form>
	);
}
