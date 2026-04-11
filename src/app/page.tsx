import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
	const session = await auth();
	if (session?.user) redirect("/matches");

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 text-center">
			<div className="flex flex-col items-center gap-4">
				<span className="text-8xl">⚽</span>
				<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
					World Cup 2026 Predictor
				</h1>
				<p className="max-w-md text-foreground-muted">
					Predict match scores, earn points, and climb the global leaderboard.
					Exact score earns <strong className="text-gold">3 pts</strong>,
					correct goal difference earns{" "}
					<strong className="text-accent">2 pts</strong>, correct winner earns{" "}
					<strong className="text-foreground">1 pt</strong>.
				</p>
			</div>

			<a
				href="/login"
				className="rounded-xl bg-accent px-8 py-3 font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
			>
				Sign in to play
			</a>
		</main>
	);
}
