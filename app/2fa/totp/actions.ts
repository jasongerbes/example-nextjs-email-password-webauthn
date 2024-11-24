"use server";

import { totpBucket } from "@/lib/server/totp";
import { getCurrentSession, setSessionAs2FAVerified } from "@/lib/server/session";
import { getUserTOTPKey } from "@/lib/server/totp";
import { verifyTOTP } from "@oslojs/otp";
import { redirect } from "next/navigation";
import { globalPOSTRateLimit } from "@/lib/server/request";

export async function verify2FAAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
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
	if (!user.emailVerified || !user.registeredTOTP || session.twoFactorVerified) {
		return {
			message: "Forbidden"
		};
	}
	if (!totpBucket.check(user.id, 1)) {
		return {
			message: "Too many requests"
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
	if (!totpBucket.consume(user.id, 1)) {
		return {
			message: "Too many requests"
		};
	}
	const totpKey = getUserTOTPKey(user.id);
	if (totpKey === null) {
		return {
			message: "Forbidden"
		};
	}
	if (!verifyTOTP(totpKey, 30, 6, code)) {
		return {
			message: "Invalid code"
		};
	}
	totpBucket.reset(user.id);
	setSessionAs2FAVerified(session.id);
	return redirect("/");
}

interface ActionResult {
	message: string;
}
