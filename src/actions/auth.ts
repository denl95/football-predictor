"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const RegisterSchema = z.object({
	name: z.string().min(2),
	email: z.email(),
	password: z.string().min(8),
});

export type RegisterState =
	| { success: true }
	| { success: false; error: string };

export async function registerUser(
	_prev: RegisterState | null,
	formData: FormData,
): Promise<RegisterState> {
	const parsed = RegisterSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		password: formData.get("password"),
	});

	if (!parsed.success) {
		const first = parsed.error.issues[0];
		return { success: false, error: first?.message ?? "Invalid input" };
	}

	const { name, email, password } = parsed.data;

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		return {
			success: false,
			error: "An account with this email already exists",
		};
	}

	const passwordHash = await bcrypt.hash(password, 12);

	await prisma.user.create({
		data: { name, email, passwordHash },
	});

	return { success: true };
}
