"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AdminActionResult =
	| { success: true }
	| { success: false; error: string };

async function requireAdmin(): Promise<string | null> {
	const session = await auth();
	if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL)
		return null;
	return session.user.id ?? null;
}

/** Admin: permanently delete a user and all of their data. */
export async function deleteUser(userId: string): Promise<AdminActionResult> {
	const adminId = await requireAdmin();
	if (!adminId) return { success: false, error: "Forbidden" };
	if (userId === adminId)
		return { success: false, error: "You can't delete your own account" };

	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) return { success: false, error: "User not found" };

	// League.creator has no cascade, so remove leagues this user created first
	// (that cascades to their members). Deleting the user then cascades the
	// remaining relations: accounts, sessions, predictions, bracket picks,
	// league memberships.
	await prisma.$transaction(async (tx) => {
		await tx.league.deleteMany({ where: { createdBy: userId } });
		await tx.user.delete({ where: { id: userId } });
	});

	revalidatePath("/admin");
	return { success: true };
}
