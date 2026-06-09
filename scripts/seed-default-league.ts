import { prisma } from "../src/lib/db";

async function main() {
	const adminEmail = process.env.ADMIN_EMAIL;
	if (!adminEmail) {
		console.error("ADMIN_EMAIL env var is not set.");
		process.exit(1);
	}

	const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
	if (!admin) {
		console.error(
			`No user found with email "${adminEmail}". Sign in first, then re-run this script.`,
		);
		process.exit(1);
	}

	const league = await prisma.league.upsert({
		where: { slug: "global" },
		create: { name: "Global", slug: "global", createdBy: admin.id },
		update: {},
	});

	const users = await prisma.user.findMany({ select: { id: true } });

	await prisma.leagueMember.createMany({
		data: users.map((u) => ({ leagueId: league.id, userId: u.id })),
		skipDuplicates: true,
	});

	console.log(
		`Done. Added ${users.length} user(s) to "${league.name}" (slug: ${league.slug}).`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
