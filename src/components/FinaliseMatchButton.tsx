"use client";

import { useTransition } from "react";
import { finaliseMatch } from "@/actions/predictions";

export function FinaliseMatchButton({
	matchId,
	homeScore,
	awayScore,
}: Readonly<{ matchId: string; homeScore: number; awayScore: number }>) {
	const [pending, startTransition] = useTransition();

	function handleClick() {
		startTransition(async () => {
			await finaliseMatch(matchId, homeScore, awayScore);
		});
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={pending}
			className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-background transition-opacity disabled:opacity-40"
		>
			{pending ? "Scoring…" : "Score now"}
		</button>
	);
}
