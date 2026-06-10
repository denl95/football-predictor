import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { auth, signOut } from "@/lib/auth";
import { countMissingPredictions } from "@/lib/prediction-status";

export async function Navbar() {
	const session = await auth();
	const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;
	const pendingCount = session?.user?.id
		? await countMissingPredictions(session.user.id)
		: 0;

	return (
		<header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
			<div className="mx-auto max-w-6xl px-4">
				{/* Main row: logo · (desktop nav) · user */}
				<div className="flex items-center justify-between py-3">
					<Link
						href="/matches"
						className="flex items-center gap-2 font-bold text-foreground hover:text-accent transition-colors"
					>
						<span className="text-2xl">⚽</span>
						<span className="hidden sm:block">WC 2026 Predictor</span>
					</Link>

					<div className="hidden md:block">
						<NavLinks isAdmin={isAdmin} pendingCount={pendingCount} />
					</div>

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

				{/* Mobile nav row */}
				<div className="md:hidden overflow-x-auto border-t border-border/40 py-1.5 -mx-4 px-2">
					<NavLinks
						className="min-w-max"
						isAdmin={isAdmin}
						pendingCount={pendingCount}
					/>
				</div>
			</div>
		</header>
	);
}
