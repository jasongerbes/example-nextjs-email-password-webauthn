import { PasswordResetForm } from "./components";

import { getCurrentPasswordResetSession } from "@/lib/server/password-reset";
import { redirect } from "next/navigation";

export default function Page() {
	const { session, user } = getCurrentPasswordResetSession();
	if (session === null) {
		return redirect("/forgot-password");
	}
	if (!session.emailVerified) {
		return redirect("/reset-password/verify-email");
	}
	if (user.registered2FA && !session.twoFactorVerified) {
		return redirect("/reset-password/2fa");
	}
	return (
		<>
			<h1>Enter your new password</h1>
			<PasswordResetForm />
		</>
	);
}