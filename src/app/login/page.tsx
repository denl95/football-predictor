"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { registerUser } from "@/actions/auth";

function GoogleButton() {
	return (
		<button
			type="button"
			onClick={() => signIn("google", { callbackUrl: "/matches" })}
			className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 font-medium transition-colors hover:bg-border"
		>
			<svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
				<path
					fill="#4285F4"
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				/>
				<path
					fill="#34A853"
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				/>
				<path
					fill="#FBBC05"
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				/>
			</svg>
			Continue with Google
		</button>
	);
}

function Divider() {
	return (
		<div className="flex items-center gap-3">
			<div className="flex-1 border-t border-border" />
			<span className="text-xs text-foreground-muted">or</span>
			<div className="flex-1 border-t border-border" />
		</div>
	);
}

function SignInForm({ error }: { error: string | null }) {
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		const fd = new FormData(e.currentTarget);
		await signIn("credentials", {
			email: fd.get("email"),
			password: fd.get("password"),
			callbackUrl: "/matches",
		});
		setLoading(false);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			{error && (
				<p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
					{error}
				</p>
			)}
			<input
				name="email"
				type="email"
				placeholder="Email"
				required
				className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-foreground-muted focus:border-accent"
			/>
			<input
				name="password"
				type="password"
				placeholder="Password"
				required
				className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-foreground-muted focus:border-accent"
			/>
			<button
				type="submit"
				disabled={loading}
				className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-60"
			>
				{loading ? "Signing in…" : "Sign in"}
			</button>
		</form>
	);
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
	const [state, action, pending] = useActionState(registerUser, null);

	if (state?.success) {
		onSuccess();
	}

	return (
		<form action={action} className="flex flex-col gap-3">
			{state && !state.success && (
				<p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
					{state.error}
				</p>
			)}
			<input
				name="name"
				type="text"
				placeholder="Full name"
				required
				minLength={2}
				className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-foreground-muted focus:border-accent"
			/>
			<input
				name="email"
				type="email"
				placeholder="Email"
				required
				className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-foreground-muted focus:border-accent"
			/>
			<input
				name="password"
				type="password"
				placeholder="Password (min 8 characters)"
				required
				minLength={8}
				className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-foreground-muted focus:border-accent"
			/>
			<button
				type="submit"
				disabled={pending}
				className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-60"
			>
				{pending ? "Creating account…" : "Create account"}
			</button>
		</form>
	);
}

export default function LoginPage() {
	const searchParams = useSearchParams();
	const [mode, setMode] = useState<"signin" | "register">("signin");
	const [registered, setRegistered] = useState(false);

	const authError = searchParams.get("error");
	const signInError =
		authError === "CredentialsSignin" ? "Invalid email or password" : null;

	function handleRegistered() {
		setMode("signin");
		setRegistered(true);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
			<div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl">
				<div className="mb-6 text-center">
					<span className="text-5xl">⚽</span>
					<h1 className="mt-3 text-2xl font-bold">
						{mode === "signin" ? "Sign in to play" : "Create account"}
					</h1>
					<p className="mt-1 text-sm text-foreground-muted">
						World Cup 2026 Predictor
					</p>
				</div>

				{registered && mode === "signin" && (
					<p className="mb-4 rounded-lg bg-accent/10 px-3 py-2 text-center text-sm text-accent">
						Account created — sign in below
					</p>
				)}

				<div className="flex flex-col gap-4">
					{mode === "signin" ? (
						<>
							<SignInForm error={signInError} />
							<Divider />
							<GoogleButton />
						</>
					) : (
						<RegisterForm onSuccess={handleRegistered} />
					)}
				</div>

				<p className="mt-6 text-center text-sm text-foreground-muted">
					{mode === "signin" ? (
						<>
							No account?{" "}
							<button
								type="button"
								onClick={() => { setMode("register"); setRegistered(false); }}
								className="text-accent hover:underline"
							>
								Register
							</button>
						</>
					) : (
						<>
							Already have an account?{" "}
							<button
								type="button"
								onClick={() => setMode("signin")}
								className="text-accent hover:underline"
							>
								Sign in
							</button>
						</>
					)}
				</p>
			</div>
		</main>
	);
}
