"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createLeagueAction } from "@/actions/leagues";

export default function NewLeaguePage() {
	const [state, action, pending] = useActionState(createLeagueAction, {
		error: "",
	});

	return (
		<div className="mx-auto flex max-w-md flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Create a league</h1>
				<p className="text-sm text-foreground-muted">
					Give your league a name and share the link with friends.
				</p>
			</div>

			<form action={action} className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="name" className="text-sm font-medium">
						League name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						placeholder="e.g. Work Friends"
						maxLength={50}
						required
						className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
					/>
					{state.error && <p className="text-sm text-red-400">{state.error}</p>}
				</div>

				<button
					type="submit"
					disabled={pending}
					className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
				>
					{pending ? "Creating…" : "Create league"}
				</button>
			</form>

			<Link
				href="/leagues"
				className="text-center text-sm text-foreground-muted hover:text-foreground"
			>
				← Back to leagues
			</Link>
		</div>
	);
}
