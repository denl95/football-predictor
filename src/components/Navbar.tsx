import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Navbar() {
	const session = await auth();

	return (
		<header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
				<Link
					href="/matches"
					className="flex items-center gap-2 font-bold text-foreground hover:text-accent transition-colors"
				>
					<span className="text-2xl">⚽</span>
					<span className="hidden sm:block">WC 2026 Predictor</span>
				</Link>

				<nav className="flex items-center gap-1 text-sm">
					<Link
						href="/matches"
						className="rounded-lg px-3 py-1.5 text-foreground-muted hover:bg-surface-2 hover:text-foreground transition-colors"
					>
						Matches
					</Link>
					<Link
						href="/leaderboard"
						className="rounded-lg px-3 py-1.5 text-foreground-muted hover:bg-surface-2 hover:text-foreground transition-colors"
					>
						Leaderboard
					</Link>
					<Link
						href="/my-predictions"
						className="rounded-lg px-3 py-1.5 text-foreground-muted hover:bg-surface-2 hover:text-foreground transition-colors"
					>
						My Predictions
					</Link>
				</nav>

				{session?.user && (
					<div className="flex items-center gap-3">
						{session.user.image && (
							<Image
								src={session.user.image}
								alt={session.user.name ?? "User"}
								width={32}
								height={32}
								className="rounded-full ring-2 ring-accent/30"
							/>
						)}
						<form
							action={async () => {
								"use server";
								await signOut({ redirectTo: "/" });
							}}
						>
							<button
								type="submit"
								className="text-sm text-foreground-muted hover:text-foreground transition-colors"
							>
								Sign out
							</button>
						</form>
					</div>
				)}
			</div>
		</header>
	);
}
