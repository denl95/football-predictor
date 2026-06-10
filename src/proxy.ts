export { auth as proxy } from "@/lib/auth";

export const config = {
	matcher: [
		"/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|login$|$).*)",
	],
};
