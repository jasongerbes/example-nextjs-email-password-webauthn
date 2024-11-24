import { SignUpForm } from "./components";
import Link from "next/link";

import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { get2FARedirect } from "@/lib/server/2fa";
import { globalGETRateLimit } from "@/lib/server/request";

export default async function Page() {
	const canPerformRequest = await globalGETRateLimit();
	if (!canPerformRequest) {
		return "Too many requests";
	}

	const { session, user } = await getCurrentSession();
	if (session !== null) {
		if (!user.emailVerified) {
			return redirect("/verify-email");
		}
		if (!user.registered2FA) {
			return redirect("/2fa/setup");
		}
		if (!session.twoFactorVerified) {
			return redirect(get2FARedirect(user));
		}
		return redirect("/");
	}
	return (
		<>
			<h1>Create an account</h1>
			<p>Your username must be at least 3 characters long and your password must be at least 8 characters long.</p>
			<SignUpForm />
			<Link href="/login">Sign in</Link>
		</>
	);
}
