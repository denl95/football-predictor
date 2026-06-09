import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function LeaguesPage() {
	const session = await auth();
	if (!session?.user?.id) return null;

	const memberships = await prisma.leagueMember.findMany({
		where: { userId: session.user.id },
		include: {
			league: {
				include: { _count: { select: { members: true } } },
			},
		},
		orderBy: { joinedAt: "asc" },
	});

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold">Leagues</h1>
					<p className="text-sm text-foreground-muted">
						{memberships.length} league
						{memberships.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Link
					href="/leagues/new"
					className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white"
				>
					+ Create
				</Link>
			</div>

			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				{memberships.length === 0 ? (
					<p className="px-6 py-12 text-center text-foreground-muted">
						You're not in any leagues yet.
					</p>
				) : (
					<ul>
						{memberships.map(({ league }) => (
							<li
								key={league.id}
								className="border-b border-border last:border-b-0"
							>
								<Link
									href={`/leagues/${league.slug}`}
									className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface-2"
								>
									<span className="font-semibold">{league.name}</span>
									<span className="text-sm text-foreground-muted">
										{league._count.members} member
										{league._count.members !== 1 ? "s" : ""}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
