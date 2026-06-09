"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
	{ href: "/matches", label: "Matches" },
	{ href: "/groups", label: "Groups" },
	{ href: "/bracket", label: "Bracket" },
	{ href: "/leagues", label: "Leagues" },
	{ href: "/my-predictions", label: "My Predictions" },
];

export function NavLinks({ className }: Readonly<{ className?: string }>) {
	const pathname = usePathname();
	const navClass = className ? `flex items-center gap-1 text-sm ${className}` : "flex items-center gap-1 text-sm";
	return (
		<nav className={navClass}>
			{LINKS.map(({ href, label }) => {
				const isActive =
					pathname === href || pathname.startsWith(`${href}/`);
				return (
					<Link
						key={href}
						href={href}
						className={`rounded-lg px-3 py-1.5 transition-colors ${
							isActive
								? "bg-surface-2 text-foreground"
								: "text-foreground-muted hover:bg-surface-2 hover:text-foreground"
						}`}
					>
						{label}
					</Link>
				);
			})}
		</nav>
	);
}
