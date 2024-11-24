"use server";

import {
	createEmailVerificationRequest,
	deleteEmailVerificationRequestCookie,
	deleteUserEmailVerificationRequest,
	getCurrentUserEmailVerificationRequest,
	sendVerificationEmail,
	sendVerificationEmailBucket,
	setEmailVerificationRequestCookie
} from "@/lib/server/email-verification";
import { invalidateUserPasswordResetSessions } from "@/lib/server/password-reset";
import { ExpiringTokenBucket } from "@/lib/server/rate-limit";
import { getCurrentSession } from "@/lib/server/session";
import { updateUserEmailAndSetEmailAsVerified } from "@/lib/server/user";
import { redirect } from "next/navigation";
import { globalPOSTRateLimit } from "@/lib/server/request";

const bucket = new ExpiringTokenBucket<number>(5, 60 * 30);

export async function verifyEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
	const canPerformRequest = await globalPOSTRateLimit();
	if (!canPerformRequest) {
		return {
			message: "Too many requests"
		};
	}

	const { session, user } = await getCurrentSession();
	if (session === null) {
		return {
			message: "Not authenticated"
		};
	}
	if (user.registered2FA && !session.twoFactorVerified) {
		return {
			message: "Forbidden"
		};
	}
	if (!bucket.check(user.id, 1)) {
		return {
			message: "Too many requests"
		};
	}

	let verificationRequest = await getCurrentUserEmailVerificationRequest();
	if (verificationRequest === null) {
		return {
			message: "Not authenticated"
		};
	}
	const code = formData.get("code");
	if (typeof code !== "string") {
		return {
			message: "Invalid or missing fields"
		};
	}
	if (code === "") {
		return {
			message: "Enter your code"
		};
	}
	if (!bucket.consume(user.id, 1)) {
		return {
			message: "Too many requests"
		};
	}
	if (Date.now() >= verificationRequest.expiresAt.getTime()) {
		verificationRequest = createEmailVerificationRequest(verificationRequest.userId, verificationRequest.email);
		sendVerificationEmail(verificationRequest.email, verificationRequest.code);
		return {
			message: "The verification code was expired. We sent another code to your inbox."
		};
	}
	if (verificationRequest.code !== code) {
		return {
			message: "Incorrect code."
		};
	}
	deleteUserEmailVerificationRequest(user.id);
	invalidateUserPasswordResetSessions(user.id);
	updateUserEmailAndSetEmailAsVerified(user.id, verificationRequest.email);
	await deleteEmailVerificationRequestCookie();
	if (!user.registered2FA) {
		return redirect("/2fa/setup");
	}
	return redirect("/");
}

export async function resendEmailVerificationCodeAction(): Promise<ActionResult> {
	const canPerformRequest = await globalPOSTRateLimit();
	if (!canPerformRequest) {
		return {
			message: "Too many requests"
		};
	}

	const { session, user } = await getCurrentSession();
	if (session === null) {
		return {
			message: "Not authenticated"
		};
	}
	if (user.registered2FA && !session.twoFactorVerified) {
		return {
			message: "Forbidden"
		};
	}
	if (!sendVerificationEmailBucket.check(user.id, 1)) {
		return {
			message: "Too many requests"
		};
	}
	let verificationRequest = await getCurrentUserEmailVerificationRequest();
	if (verificationRequest === null) {
		if (user.emailVerified) {
			return {
				message: "Forbidden"
			};
		}
		if (!sendVerificationEmailBucket.consume(user.id, 1)) {
			return {
				message: "Too many requests"
			};
		}
		verificationRequest = createEmailVerificationRequest(user.id, user.email);
	} else {
		if (!sendVerificationEmailBucket.consume(user.id, 1)) {
			return {
				message: "Too many requests"
			};
		}
		verificationRequest = createEmailVerificationRequest(user.id, verificationRequest.email);
	}
	sendVerificationEmail(verificationRequest.email, verificationRequest.code);
	await setEmailVerificationRequestCookie(verificationRequest);
	return {
		message: "A new code was sent to your inbox."
	};
}

interface ActionResult {
	message: string;
}
