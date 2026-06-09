"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// clipboard unavailable — fail silently
		}
	};

	return (
		<button
			type="button"
			onClick={copy}
			className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
		>
			{copied ? "Copied!" : "Copy link"}
		</button>
	);
}
