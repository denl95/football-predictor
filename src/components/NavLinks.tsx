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

export function NavLinks({
	className,
	isAdmin = false,
	pendingCount = 0,
}: Readonly<{ className?: string; isAdmin?: boolean; pendingCount?: number }>) {
	const pathname = usePathname();
	const links = isAdmin
		? [...LINKS, { href: "/admin", label: "Admin" }]
		: LINKS;
	const navClass = className
		? `flex items-center gap-1 text-sm ${className}`
		: "flex items-center gap-1 text-sm";
	return (
		<nav className={navClass}>
			{links.map(({ href, label }) => {
				const isActive = pathname === href || pathname.startsWith(`${href}/`);
				const showBadge = href === "/matches" && pendingCount > 0;
				return (
					<Link
						key={href}
						href={href}
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
							isActive
								? "bg-surface-2 text-foreground"
								: "text-foreground-muted hover:bg-surface-2 hover:text-foreground"
						}`}
					>
						{label}
						{showBadge ? (
							<span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gold">
								{pendingCount}
							</span>
						) : null}
					</Link>
				);
			})}
		</nav>
	);
}
