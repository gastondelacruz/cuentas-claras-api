import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import mailConfig from "../../../config/mail.config";
import { buildAppActionLink } from "../../../shared/application/app-action-link";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import {
	AuthUserRepository,
	type AuthUser,
} from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";
import { createRandomToken } from "../services/random-token";
import { ttlToDate } from "../services/ttl-to-date";

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
		private readonly tokenDigest: TokenDigestService,
		private readonly verificationTokens: EmailVerificationTokenRepository,
		private readonly mail: MailDeliveryPort,
		@Inject(mailConfig.KEY)
		private readonly mailSettings: ConfigType<typeof mailConfig>,
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
		const user = await this.users.createUserWithDefaultAccount(
			{
				name: input.name,
				email: input.email,
				passwordHash,
			},
			{
				name: "Cuenta principal",
				currency: "ARS",
				kind: "cash",
			},
		);
		const accessToken = await this.tokens.signAccessToken({
			sub: user.id,
			email: user.email,
			emailVerified: false,
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

		const verificationToken = createRandomToken();
		await this.verificationTokens.save({
			userId: user.id,
			tokenDigest: this.tokenDigest.digest(verificationToken),
			expiresAt: ttlToDate(this.mailSettings.verificationTokenTtl),
		});

		await this.mail.sendVerificationEmail({
			to: user.email,
			name: user.name,
			verificationUrl: buildAppActionLink(
				this.mailSettings.appPublicUrl,
				"verify-email",
				{ token: verificationToken },
			),
		}).catch(() => undefined);

		return {
			accessToken,
			refreshToken: refresh.token,
			user,
		};
	}
}
