import { Injectable } from "@nestjs/common";
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
		private readonly tokens: TokenService,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly users: AuthUserRepository,
		private readonly passwordHasher: PasswordHasher,
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

		// Rotate: revoke the matched token and issue a new pair
		await this.refreshTokenRepository.revoke(matchedId!);

		const accessToken = await this.tokens.signAccessToken({
			sub: user!.id,
			email: user!.email,
			emailVerified: user!.emailVerifiedAt !== null && user!.emailVerifiedAt !== undefined,
		});
		const newRefresh = await this.tokens.signRefreshToken({ sub: user!.id });

		const newHash = await this.passwordHasher.hash(newRefresh.token);
		const newDigest = this.tokenDigest.digest(newRefresh.token);
		await this.refreshTokenRepository.save({
			userId: user!.id,
			tokenHash: newHash,
			tokenDigest: newDigest,
			expiresAt: newRefresh.expiresAt,
		});

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
