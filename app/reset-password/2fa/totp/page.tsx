import Link from "next/link";
import { PasswordResetTOTPForm } from "./components";

import { getCurrentPasswordResetSession } from "@/lib/server/password-reset";
import { redirect } from "next/navigation";
import { getPasswordReset2FARedirect } from "@/lib/server/2fa";
import { globalGETRateLimit } from "@/lib/server/request";

export default async function Page() {
	const canPerformRequest = await globalGETRateLimit();
	if (!canPerformRequest) {
		return "Too many requests";
	}

	const { session, user } = await getCurrentPasswordResetSession();

	if (session === null) {
		return redirect("/forgot-password");
	}
	if (!session.emailVerified) {
		return redirect("/reset-password/verify-email");
	}
	if (!user.registered2FA) {
		return redirect("/reset-password");
	}
	if (session.twoFactorVerified) {
		return redirect("/reset-password");
	}
	if (!user.registeredTOTP) {
		return redirect(getPasswordReset2FARedirect(user));
	}
	return (
		<>
			<h1>Authenticate with authenticator app</h1>
			<p>Enter the code from your app.</p>
			<PasswordResetTOTPForm />
			<Link href="/reset-password/2fa/recovery-code">Use recovery code</Link>
			{user.registeredSecurityKey && <Link href="/reset-password/2fa/security-key">Use security keys</Link>}
			{user.registeredPasskey && <Link href="/reset-password/2fa/passkey">Use passkeys</Link>}
		</>
	);
}
