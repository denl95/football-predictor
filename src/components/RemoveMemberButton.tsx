"use client";

import { useState, useTransition } from "react";
import { removeMember } from "@/actions/leagues";

export function RemoveMemberButton({
	slug,
	userId,
	userName,
}: Readonly<{ slug: string; userId: string; userName: string }>) {
	const [confirming, setConfirming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleRemove() {
		setError(null);
		startTransition(async () => {
			const result = await removeMember(slug, userId);
			if (!result.success) {
				setError(result.error);
				setConfirming(false);
			}
		});
	}

	if (confirming) {
		return (
			<div className="flex items-center gap-2 pr-5">
				<span className="text-xs text-foreground-muted">
					Remove {userName}?
				</span>
				<button
					type="button"
					disabled={pending}
					onClick={handleRemove}
					className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
				>
					{pending ? "Removing…" : "Confirm"}
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={() => setConfirming(false)}
					className="rounded-lg px-2.5 py-1 text-xs text-foreground-muted transition-colors hover:text-foreground disabled:opacity-50"
				>
					Cancel
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 pr-5">
			{error ? <span className="text-xs text-red-400">{error}</span> : null}
			<button
				type="button"
				onClick={() => setConfirming(true)}
				className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-red-400"
			>
				Remove
			</button>
		</div>
	);
}
