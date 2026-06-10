"use client";

import { useState, useTransition } from "react";
import { renameLeague } from "@/actions/leagues";

export function RenameLeagueForm({
	slug,
	currentName,
}: Readonly<{ slug: string; currentName: string }>) {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(currentName);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function handleSave() {
		setError(null);
		startTransition(async () => {
			const result = await renameLeague(slug, name);
			if (result.success) {
				setEditing(false);
			} else {
				setError(result.error);
			}
		});
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => {
					setName(currentName);
					setEditing(true);
				}}
				className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
			>
				Rename
			</button>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-2">
				<input
					autoFocus
					value={name}
					maxLength={50}
					disabled={pending}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSave();
						if (e.key === "Escape") setEditing(false);
					}}
					className="w-48 rounded-lg bg-surface-2 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/50"
				/>
				<button
					type="button"
					disabled={pending}
					onClick={handleSave}
					className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
				>
					{pending ? "Saving…" : "Save"}
				</button>
				<button
					type="button"
					disabled={pending}
					onClick={() => setEditing(false)}
					className="rounded-lg px-2 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground disabled:opacity-50"
				>
					Cancel
				</button>
			</div>
			{error ? <span className="text-xs text-red-400">{error}</span> : null}
		</div>
	);
}
