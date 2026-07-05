import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	AuthUserRepository,
	type AuthUser,
} from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";

export type LoginInput = {
	email: string;
	password: string;
};

export type LoginResult = {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
};

@Injectable()
export class LoginUseCase {
	constructor(
		private readonly users: AuthUserRepository,
		private readonly passwordHasher: PasswordHasher,
		private readonly tokens: TokenService,
		private readonly refreshTokens: RefreshTokenRepository,
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: LoginInput): Promise<LoginResult> {
		const loginUser = await this.users.findByEmailForLogin(input.email);

		if (!loginUser || !loginUser.passwordHash) {
			this.rejectInvalidCredentials();
		}

		const isValid = await this.passwordHasher.verify(
			input.password,
			loginUser!.passwordHash!,
		);

		if (!isValid) {
			this.rejectInvalidCredentials();
		}

		const user: AuthUser = {
			id: loginUser!.id,
			name: loginUser!.name,
			email: loginUser!.email,
		};

		const accessToken = await this.tokens.signAccessToken({
			sub: user.id,
			email: user.email,
			emailVerified: loginUser!.emailVerifiedAt !== null && loginUser!.emailVerifiedAt !== undefined,
		});
		const refresh = await this.tokens.signRefreshToken({ sub: user.id });
		const refreshTokenHash = await this.passwordHasher.hash(refresh.token);
		const refreshTokenDigest = this.tokenDigest.digest(refresh.token);

		await this.refreshTokens.save({
			userId: user.id,
			tokenHash: refreshTokenHash,
			tokenDigest: refreshTokenDigest,
			expiresAt: refresh.expiresAt,
		});

		return {
			accessToken,
			refreshToken: refresh.token,
			user,
		};
	}

	private rejectInvalidCredentials(): never {
		throw new BusinessException(
			"INVALID_CREDENTIALS",
			"Invalid credentials.",
			401,
		);
	}
}
