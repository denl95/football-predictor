"use client";

import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the viewer's local timezone. Match times are stored as
 * UTC instants and pages are server-rendered, so without this they'd show the
 * server's timezone for everyone. The server-formatted `fallback` is shown on the
 * first paint (and during hydration, so markup matches), then replaced with the
 * browser-local time after mount.
 */
export function LocalDateTime({
	iso,
	fallback,
	options,
}: Readonly<{
	iso: string;
	fallback: string;
	options: Intl.DateTimeFormatOptions;
}>) {
	const [text, setText] = useState(fallback);

	useEffect(() => {
		setText(new Date(iso).toLocaleString("en-GB", options));
	}, [iso, options]);

	return (
		<time dateTime={iso} suppressHydrationWarning>
			{text}
		</time>
	);
}
