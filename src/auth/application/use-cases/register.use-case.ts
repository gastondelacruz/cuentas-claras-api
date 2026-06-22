import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	AuthUserRepository,
	type AuthUser,
} from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenService } from "../../domain/ports/token.service";

export type RegisterInput = {
	name: string;
	email: string;
	password: string;
};

export type RegisterResult = {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
};

@Injectable()
export class RegisterUseCase {
	constructor(
		private readonly users: AuthUserRepository,
		private readonly passwordHasher: PasswordHasher,
		private readonly tokens: TokenService,
		private readonly refreshTokens: RefreshTokenRepository,
	) {}

	async execute(input: RegisterInput): Promise<RegisterResult> {
		const existingUser = await this.users.findByEmail(input.email);

		if (existingUser) {
			throw new BusinessException(
				"EMAIL_ALREADY_EXISTS",
				"Email already registered.",
				409,
			);
		}

		const passwordHash = await this.passwordHasher.hash(input.password);
		const user = await this.users.createWithPassword({
			name: input.name,
			email: input.email,
			passwordHash,
		});
		const accessToken = await this.tokens.signAccessToken({
			sub: user.id,
			email: user.email,
		});
		const refresh = await this.tokens.signRefreshToken({ sub: user.id });
		const refreshTokenHash = await this.passwordHasher.hash(refresh.token);

		await this.refreshTokens.save({
			userId: user.id,
			tokenHash: refreshTokenHash,
			expiresAt: refresh.expiresAt,
		});

		return {
			accessToken,
			refreshToken: refresh.token,
			user,
		};
	}
}
