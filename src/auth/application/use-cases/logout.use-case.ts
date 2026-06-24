import { Injectable } from "@nestjs/common";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";

export type LogoutInput = {
	refreshToken: string;
	userId: string;
};

@Injectable()
export class LogoutUseCase {
	constructor(
		private readonly refreshTokens: RefreshTokenRepository,
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: LogoutInput): Promise<void> {
		const digest = this.tokenDigest.digest(input.refreshToken);
		const token = await this.refreshTokens.findByDigest(digest);

		if (!token) {
			return;
		}

		if (token.revokedAt !== null) {
			return;
		}

		if (token.userId !== input.userId) {
			return;
		}

		await this.refreshTokens.revoke(token.id);
	}
}
