import { Inject, Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";

export type RefreshInput = {
	refreshToken: string;
};

export type RefreshResult = {
	accessToken: string;
	refreshToken: string;
};

@Injectable()
export class RefreshTokenUseCase {
	constructor(
		@Inject(TokenService)
		private readonly tokens: TokenService,
		@Inject(RefreshTokenRepository)
		private readonly refreshTokenRepository: RefreshTokenRepository,
		@Inject(AuthUserRepository)
		private readonly users: AuthUserRepository,
		@Inject(PasswordHasher)
		private readonly passwordHasher: PasswordHasher,
		@Inject(TokenDigestService)
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: RefreshInput): Promise<RefreshResult> {
		let userId: string;

		try {
			const payload = await this.tokens.verifyRefreshToken(input.refreshToken);
			userId = payload.sub;
		} catch {
			this.rejectInvalidToken();
		}

		const user = await this.users.findById(userId!);

		if (!user) {
			this.rejectInvalidToken();
		}

		const activeTokens = await this.refreshTokenRepository.findActiveByUserId(userId!);

		if (activeTokens.length === 0) {
			this.rejectInvalidToken();
		}

		let matchedId: string | null = null;
		for (const row of activeTokens) {
			const isMatch = await this.passwordHasher.verify(input.refreshToken, row.tokenHash);
			if (isMatch) {
				matchedId = row.id;
				break;
			}
		}

		if (matchedId === null) {
			// Reuse detected: revoke all active tokens for this user
			await this.refreshTokenRepository.revokeAllByUserId(userId!);
			this.rejectInvalidToken();
		}

		const accessToken = await this.tokens.signAccessToken({
			sub: user!.id,
			email: user!.email,
			emailVerified: user!.emailVerifiedAt !== null && user!.emailVerifiedAt !== undefined,
		});
		const newRefresh = await this.tokens.signRefreshToken({ sub: user!.id });

		const newHash = await this.passwordHasher.hash(newRefresh.token);
		const newDigest = this.tokenDigest.digest(newRefresh.token);
		const rotated = await this.refreshTokenRepository.rotateIfActive(
			matchedId!,
			{
				userId: user!.id,
				tokenHash: newHash,
				tokenDigest: newDigest,
				expiresAt: newRefresh.expiresAt,
			},
			user!.emailVerifiedAt ?? null,
		);

		if (!rotated) {
			this.rejectInvalidToken();
		}

		return {
			accessToken,
			refreshToken: newRefresh.token,
		};
	}

	private rejectInvalidToken(): never {
		throw new BusinessException(
			"INVALID_REFRESH_TOKEN",
			"Invalid or expired refresh token.",
			401,
		);
	}
}
