"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateSlug(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 30);
	const suffix = Math.random().toString(36).slice(2, 6);
	return base ? `${base}-${suffix}` : suffix;
}

// Used with useActionState — redirects on success, returns error state on failure.
export async function createLeagueAction(
	_: { error?: string },
	formData: FormData,
): Promise<{ error: string }> {
	const session = await auth();
	if (!session?.user?.id) return { error: "Unauthorised" };

	const name = (formData.get("name") as string | null)?.trim() ?? "";
	if (!name || name.length > 50)
		return { error: "Name must be 1–50 characters" };

	let slug = generateSlug(name);
	let existing = await prisma.league.findUnique({ where: { slug } });
	if (existing) {
		slug = generateSlug(name);
		existing = await prisma.league.findUnique({ where: { slug } });
		if (existing)
			return { error: "Could not generate a unique slug — please try again" };
	}

	let league: Awaited<ReturnType<typeof prisma.league.create>>;
	try {
		league = await prisma.league.create({
			data: {
				name,
				slug,
				createdBy: session.user.id,
				members: { create: { userId: session.user.id } },
			},
		});
	} catch (e) {
		if (
			e instanceof Prisma.PrismaClientKnownRequestError &&
			e.code === "P2002"
		) {
			return { error: "Could not generate a unique slug — please try again" };
		}
		throw e;
	}

	revalidatePath("/leagues");
	redirect(`/leagues/${league.slug}`);
}

export type LeagueActionResult =
	| { success: true }
	| { success: false; error: string };

/** Creator-only: rename a league (slug stays stable to keep join links valid). */
export async function renameLeague(
	slug: string,
	name: string,
): Promise<LeagueActionResult> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 50)
		return { success: false, error: "Name must be 1–50 characters" };

	const league = await prisma.league.findUnique({ where: { slug } });
	if (!league) return { success: false, error: "League not found" };
	if (league.createdBy !== session.user.id)
		return { success: false, error: "Only the league creator can rename it" };

	await prisma.league.update({
		where: { id: league.id },
		data: { name: trimmed },
	});

	revalidatePath(`/leagues/${slug}`);
	revalidatePath("/leagues");
	return { success: true };
}

/** Creator-only: remove a member from a league. */
export async function removeMember(
	slug: string,
	userId: string,
): Promise<LeagueActionResult> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	const league = await prisma.league.findUnique({ where: { slug } });
	if (!league) return { success: false, error: "League not found" };
	if (league.createdBy !== session.user.id)
		return {
			success: false,
			error: "Only the league creator can remove members",
		};
	if (userId === league.createdBy)
		return { success: false, error: "The creator can't be removed" };

	await prisma.leagueMember.delete({
		where: { leagueId_userId: { leagueId: league.id, userId } },
	});

	revalidatePath(`/leagues/${slug}`);
	revalidatePath("/leagues");
	return { success: true };
}

export async function joinLeague(
	slug: string,
): Promise<{ success: true } | { success: false; error: string }> {
	const session = await auth();
	if (!session?.user?.id) return { success: false, error: "Unauthorised" };

	const league = await prisma.league.findUnique({ where: { slug } });
	if (!league) return { success: false, error: "League not found" };

	await prisma.leagueMember.upsert({
		where: {
			leagueId_userId: { leagueId: league.id, userId: session.user.id },
		},
		create: { leagueId: league.id, userId: session.user.id },
		update: {},
	});

	revalidatePath(`/leagues/${slug}`);
	revalidatePath("/leagues");
	return { success: true };
}
