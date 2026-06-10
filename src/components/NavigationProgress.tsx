"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
	const pathname = usePathname();
	const [width, setWidth] = useState(0);
	const [visible, setVisible] = useState(false);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const creepTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	// Route changed → complete the bar
	useEffect(() => {
		setWidth(100);
		clearTimeout(hideTimer.current);
		hideTimer.current = setTimeout(() => {
			setVisible(false);
			setWidth(0);
		}, 400);
		return () => clearTimeout(hideTimer.current);
	}, [pathname]);

	// Detect link clicks to start the bar
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const anchor = (e.target as HTMLElement).closest("a");
			if (!anchor) return;
			const href = anchor.getAttribute("href");
			if (
				!href ||
				href.startsWith("#") ||
				href.startsWith("http") ||
				href.startsWith("mailto:")
			)
				return;
			clearTimeout(hideTimer.current);
			clearTimeout(creepTimer.current);
			setVisible(true);
			setWidth(30);
			creepTimer.current = setTimeout(() => setWidth(65), 300);
		};

		document.addEventListener("click", handleClick);
		return () => {
			document.removeEventListener("click", handleClick);
			clearTimeout(creepTimer.current);
		};
	}, []);

	const loading = visible && width < 100;

	let barTransition: string;
	if (width === 0) barTransition = "opacity 300ms ease-out";
	else if (width === 100)
		barTransition = "width 150ms ease-out, opacity 300ms ease-out";
	else barTransition = "width 300ms ease-out, opacity 150ms ease-in";

	return (
		<>
			<div
				className="fixed top-0 left-0 z-200 h-0.5 bg-accent"
				style={{
					width: `${width}%`,
					opacity: visible ? 1 : 0,
					transition: barTransition,
				}}
			/>
			<div
				className="fixed bottom-5 right-5 z-200 h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin"
				style={{
					opacity: loading ? 1 : 0,
					transition: "opacity 150ms ease-out",
					pointerEvents: "none",
				}}
			/>
		</>
	);
}
