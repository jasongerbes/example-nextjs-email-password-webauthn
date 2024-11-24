import { generateRandomOTP } from "./utils";
import { db } from "./db";
import { ExpiringTokenBucket } from "./rate-limit";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { cookies } from "next/headers";
import { getCurrentSession } from "./session";
import { cache } from "react";

export function getUserEmailVerificationRequest(userId: number, id: string): EmailVerificationRequest | null {
	const row = db.queryOne(
		"SELECT id, user_id, code, email, expires_at FROM email_verification_request WHERE id = ? AND user_id = ?",
		[id, userId]
	);
	if (row === null) {
		return row;
	}
	const request: EmailVerificationRequest = {
		id: row.string(0),
		userId: row.number(1),
		code: row.string(2),
		email: row.string(3),
		expiresAt: new Date(row.number(4) * 1000)
	};
	return request;
}

export function createEmailVerificationRequest(userId: number, email: string): EmailVerificationRequest {
	deleteUserEmailVerificationRequest(userId);
	const idBytes = new Uint8Array(20);
	crypto.getRandomValues(idBytes);
	const id = encodeBase32LowerCaseNoPadding(idBytes);

	const code = generateRandomOTP();
	const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
	db.queryOne(
		"INSERT INTO email_verification_request (id, user_id, code, email, expires_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
		[id, userId, code, email, Math.floor(expiresAt.getTime() / 1000)]
	);

	const request: EmailVerificationRequest = {
		id,
		userId,
		code,
		email,
		expiresAt
	};
	return request;
}

export function deleteUserEmailVerificationRequest(userId: number): void {
	db.execute("DELETE FROM email_verification_request WHERE user_id = ?", [userId]);
}

export function sendVerificationEmail(email: string, code: string): void {
	console.log(`To ${email}: Your verification code is ${code}`);
}

export async function setEmailVerificationRequestCookie(request: EmailVerificationRequest): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set("email_verification", request.id, {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		expires: request.expiresAt
	});
}

export async function deleteEmailVerificationRequestCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set("email_verification", "", {
		httpOnly: true,
		path: "/",
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 0
	});
}

export const getCurrentUserEmailVerificationRequest = cache(async () => {
	const { user } = await getCurrentSession();
	if (user === null) {
		return null;
	}
	const cookieStore = await cookies();
	const id = cookieStore.get("email_verification")?.value ?? null;
	if (id === null) {
		return null;
	}
	const request = getUserEmailVerificationRequest(user.id, id);
	if (request === null) {
		await deleteEmailVerificationRequestCookie();
	}
	return request;
});

export const sendVerificationEmailBucket = new ExpiringTokenBucket<number>(3, 60 * 10);

export interface EmailVerificationRequest {
	id: string;
	userId: number;
	code: string;
	email: string;
	expiresAt: Date;
}
