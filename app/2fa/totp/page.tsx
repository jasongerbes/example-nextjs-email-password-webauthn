import Link from "next/link";

import { TwoFactorVerificationForm } from "./components";
import { getCurrentSession } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { globalGETRateLimit } from "@/lib/server/request";

export default async function Page() {
	const canPerformRequest = await globalGETRateLimit();
	if (!canPerformRequest) {
		return "Too many requests";
	}

	const { session, user } = await getCurrentSession();
	if (session === null) {
		return redirect("/login");
	}
	if (!user.emailVerified) {
		return redirect("/verify-email");
	}
	if (!user.registered2FA) {
		return redirect("/2fa/setup");
	}
	if (session.twoFactorVerified) {
		return redirect("/");
	}
	return (
		<>
			<h1>Authenticate with authenticator app</h1>
			<p>Enter the code from your app.</p>
			<TwoFactorVerificationForm />
			<Link href="/2fa/reset">Use recovery code</Link>
			{user.registeredPasskey && <Link href="/2fa/passkey">Use passkeys</Link>}
			{user.registeredSecurityKey && <Link href="/2fa/security-key">Use security keys</Link>}
		</>
	);
}
