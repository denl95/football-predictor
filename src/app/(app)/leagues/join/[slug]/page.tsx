import { redirect } from "next/navigation";
import { joinLeague } from "@/actions/leagues";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function JoinLeaguePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth();
	if (!session?.user?.id) return null;

	const league = await prisma.league.findUnique({
		where: { slug },
		include: { _count: { select: { members: true } } },
	});

	if (!league) {
		return (
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
				<h1 className="text-2xl font-bold">League not found</h1>
				<p className="text-foreground-muted">
					This invite link is invalid or has been removed.
				</p>
			</div>
		);
	}

	const existing = await prisma.leagueMember.findUnique({
		where: {
			leagueId_userId: { leagueId: league.id, userId: session.user.id },
		},
	});

	if (existing) redirect(`/leagues/${slug}`);

	async function handleJoin() {
		"use server";
		await joinLeague(slug);
		redirect(`/leagues/${slug}`);
	}

	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center">
			<div className="flex flex-col items-center gap-2">
				<h1 className="text-2xl font-bold">Join {league.name}</h1>
				<p className="text-sm text-foreground-muted">
					{league._count.members} member
					{league._count.members !== 1 ? "s" : ""} · compete on this leaderboard
				</p>
			</div>

			<form action={handleJoin}>
				<button
					type="submit"
					className="rounded-xl bg-accent px-8 py-3 font-semibold text-white"
				>
					Join league
				</button>
			</form>
		</div>
	);
}
