import Image from "next/image";
import { redirect } from "next/navigation";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { FinaliseMatchButton } from "@/components/FinaliseMatchButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
	const session = await auth();
	if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL)
		redirect("/matches");
	const adminId = session.user.id;

	// Matches that are finished with scores but have unscored predictions
	const unscoredMatches = await prisma.match.findMany({
		where: {
			status: "FINISHED",
			homeScore: { not: null },
			awayScore: { not: null },
			predictions: { some: { points: null } },
		},
		orderBy: { scheduledAt: "asc" },
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeScore: true,
			awayScore: true,
			group: true,
			scheduledAt: true,
		},
	});

	const users = await prisma.user.findMany({
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			createdAt: true,
			_count: { select: { predictions: true, bracketMatchPicks: true } },
		},
	});

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			{unscoredMatches.length > 0 && (
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1">
						<h2 className="text-xl font-bold text-red-400">Unscored matches</h2>
						<p className="text-sm text-foreground-muted">
							These matches are finished with scores but predictions
							haven&apos;t been awarded points yet.
						</p>
					</div>
					<div className="overflow-hidden rounded-2xl border border-red-500/30 bg-surface">
						<ul>
							{unscoredMatches.map((m) => (
								<li
									key={m.id}
									className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
								>
									<div className="flex-1 text-sm">
										<div className="font-semibold">
											{m.homeTeam} {m.homeScore} – {m.awayScore} {m.awayTeam}
										</div>
										<div className="text-xs text-foreground-muted">
											{m.group} ·{" "}
											{new Date(m.scheduledAt).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
											})}
										</div>
									</div>
									<FinaliseMatchButton
										matchId={m.id}
										homeScore={m.homeScore!}
										awayScore={m.awayScore!}
									/>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold">Admin · Users</h1>
				<p className="text-sm text-foreground-muted">
					{users.length} user{users.length !== 1 ? "s" : ""}. Deleting a user
					permanently removes their predictions, bracket picks, league
					memberships and any leagues they created.
				</p>
			</div>

			<div className="overflow-hidden rounded-2xl border border-border bg-surface">
				<ul>
					{users.map((user) => {
						const isSelf = user.id === adminId;
						return (
							<li
								key={user.id}
								className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
							>
								{user.image ? (
									<Image
										src={user.image}
										alt={user.name ?? ""}
										width={36}
										height={36}
										className="rounded-full"
									/>
								) : (
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold">
										{(user.name ?? user.email)[0]?.toUpperCase()}
									</div>
								)}

								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 font-semibold">
										<span className="truncate">{user.name ?? "Anonymous"}</span>
										{isSelf ? (
											<span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
												you
											</span>
										) : null}
									</div>
									<div className="truncate text-xs text-foreground-muted">
										{user.email} · {user._count.predictions} prediction
										{user._count.predictions !== 1 ? "s" : ""} ·{" "}
										{user._count.bracketMatchPicks} bracket pick
										{user._count.bracketMatchPicks !== 1 ? "s" : ""}
									</div>
								</div>

								{isSelf ? null : (
									<DeleteUserButton
										userId={user.id}
										userName={user.name ?? user.email}
									/>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
