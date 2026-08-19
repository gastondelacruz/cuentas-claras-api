import { Inject, Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { PasswordResetRepository } from "../../domain/ports/password-reset.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";

export type ResetPasswordInput = {
	token: string;
	password: string;
};

@Injectable()
export class ResetPasswordUseCase {
	constructor(
		@Inject(PasswordResetRepository)
		private readonly resetTokens: PasswordResetRepository,
		@Inject(TokenDigestService)
		private readonly tokenDigest: TokenDigestService,
		@Inject(PasswordHasher)
		private readonly passwordHasher: PasswordHasher,
	) {}

	async execute(input: ResetPasswordInput): Promise<void> {
		const token = await this.resetTokens.findByDigest(
			this.tokenDigest.digest(input.token),
		);

		if (!token) {
			this.rejectInvalidToken();
		}

		if (token!.consumedAt !== null) {
			throw new BusinessException(
				"PASSWORD_RESET_TOKEN_CONSUMED",
				"Password reset token has already been used.",
				409,
			);
		}

		if (token!.expiresAt <= new Date()) {
			throw new BusinessException(
				"PASSWORD_RESET_TOKEN_EXPIRED",
				"Password reset token has expired.",
				410,
			);
		}

		const passwordHash = await this.passwordHasher.hash(input.password);
		const completed = await this.resetTokens.complete({
			tokenId: token!.id,
			userId: token!.userId,
			passwordHash,
			completedAt: new Date(),
		});

		if (!completed) {
			throw new BusinessException(
				"PASSWORD_RESET_TOKEN_CONSUMED",
				"Password reset token has already been used.",
				409,
			);
		}
	}

	private rejectInvalidToken(): never {
		throw new BusinessException(
			"PASSWORD_RESET_TOKEN_INVALID",
			"Invalid password reset token.",
			400,
		);
	}
}
