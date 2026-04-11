import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

// biome-ignore lint/suspicious/noExplicitAny: generated Prisma client type doesn't match @prisma/client at the type level
const prismaAdapter = PrismaAdapter(prisma as any);

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: prismaAdapter,
	providers: [Google],
	pages: {
		signIn: "/login",
	},
	callbacks: {
		session({ session, user }) {
			session.user.id = user.id;
			return session;
		},
	},
});
