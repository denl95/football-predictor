"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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

	return (
		<div
			className="fixed top-0 left-0 z-[200] h-[2px] bg-accent"
			style={{
				width: `${width}%`,
				opacity: visible ? 1 : 0,
				transition:
					width === 0
						? "opacity 300ms ease-out"
						: width === 100
							? "width 150ms ease-out, opacity 300ms ease-out"
							: "width 300ms ease-out, opacity 150ms ease-in",
			}}
		/>
	);
}
