import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";

export type VerifyEmailInput = {
	token: string;
};

@Injectable()
export class VerifyEmailUseCase {
	constructor(
		private readonly verificationTokens: EmailVerificationTokenRepository,
		private readonly users: AuthUserRepository,
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: VerifyEmailInput): Promise<void> {
		const digest = this.tokenDigest.digest(input.token);
		const token = await this.verificationTokens.findByDigest(digest);

		if (!token) {
			this.rejectInvalidToken();
		}

		if (token!.consumedAt !== null) {
			throw new BusinessException("EMAIL_VERIFICATION_TOKEN_CONSUMED", "Email verification token was already used.", 409);
		}

		if (token!.expiresAt.getTime() <= Date.now()) {
			throw new BusinessException("EMAIL_VERIFICATION_TOKEN_EXPIRED", "Email verification token expired.", 410);
		}

		const now = new Date();
		const consumed = await this.verificationTokens.consume(token!.id, now);

		if (!consumed) {
			throw new BusinessException("EMAIL_VERIFICATION_TOKEN_CONSUMED", "Email verification token was already used.", 409);
		}

		await this.users.markEmailVerified(token!.userId, now);
	}

	private rejectInvalidToken(): never {
		throw new BusinessException("EMAIL_VERIFICATION_TOKEN_INVALID", "Invalid email verification token.", 400);
	}
}
