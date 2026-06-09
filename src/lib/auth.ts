import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";

// biome-ignore lint/suspicious/noExplicitAny: generated Prisma client type doesn't match @prisma/client at the type level
const prismaAdapter = PrismaAdapter(prisma as any);

const CredentialsSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: prismaAdapter,
	// JWT strategy is required when using Credentials provider alongside an adapter
	session: { strategy: "jwt" },
	providers: [
		Google,
		Credentials({
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsed = CredentialsSchema.safeParse(credentials);
				if (!parsed.success) return null;

				const { email, password } = parsed.data;

				const user = await prisma.user.findUnique({ where: { email } });
				if (!user?.passwordHash) return null;

				const valid = await bcrypt.compare(password, user.passwordHash);
				if (!valid) return null;

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				};
			},
		}),
	],
	pages: {
		signIn: "/login",
	},
	callbacks: {
		jwt({ token, user }) {
			// On sign-in, persist user id into the token
			if (user) token.sub = user.id;
			return token;
		},
		session({ session, token }) {
			// JWT strategy provides token, not user
			if (token.sub) session.user.id = token.sub;
			return session;
		},
	},
});
