import { Inject, Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	AuthUserRepository,
	type AuthUser,
} from "../../domain/ports/auth-user.repository";
import { GoogleTokenVerifier } from "../../domain/ports/google-token-verifier";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";
import { createDefaultAccountInput } from "../services/default-account";

export type GoogleLoginInput = {
	idToken: string;
};

export type GoogleLoginResult = {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
};

type GoogleUserResolution =
	| { user: AuthUser; claim: null }
	| {
			user: AuthUser;
			claim: {
				input: {
					googleId: string;
					avatarUrl: string | null;
					emailVerifiedAt: Date;
				};
			};
	  };

@Injectable()
export class GoogleLoginUseCase {
	constructor(
		@Inject(AuthUserRepository)
		private readonly users: AuthUserRepository,
		@Inject(GoogleTokenVerifier)
		private readonly googleTokens: GoogleTokenVerifier,
		@Inject(PasswordHasher)
		private readonly passwordHasher: PasswordHasher,
		@Inject(TokenService)
		private readonly tokens: TokenService,
		@Inject(RefreshTokenRepository)
		private readonly refreshTokens: RefreshTokenRepository,
		@Inject(TokenDigestService)
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: GoogleLoginInput): Promise<GoogleLoginResult> {
		const googleUser = await this.googleTokens.verifyIdToken(input.idToken);

		if (!googleUser.emailVerified) {
			throw new BusinessException(
				"GOOGLE_EMAIL_NOT_VERIFIED",
				"Google email must be verified.",
				401,
			);
		}

		const resolution = await this.resolveUser({
			googleId: googleUser.googleId,
			email: googleUser.email,
			name: googleUser.name,
			avatarUrl: googleUser.avatarUrl,
		});
		const accessToken = await this.tokens.signAccessToken({
			sub: resolution.user.id,
			email: resolution.user.email,
			emailVerified:
				resolution.claim !== null ||
				(resolution.user.emailVerifiedAt !== null &&
					resolution.user.emailVerifiedAt !== undefined),
		});
		const refresh = await this.tokens.signRefreshToken({
			sub: resolution.user.id,
		});
		const refreshTokenHash = await this.passwordHasher.hash(refresh.token);
		const refreshTokenDigest = this.tokenDigest.digest(refresh.token);
		const replacementRefreshToken = {
			userId: resolution.user.id,
			tokenHash: refreshTokenHash,
			tokenDigest: refreshTokenDigest,
			expiresAt: refresh.expiresAt,
		};
		const user = resolution.claim
			? await this.users.claimUnverifiedGoogleAccount(
					resolution.user.id,
					resolution.claim.input,
					replacementRefreshToken,
				)
			: resolution.user;

		if (!resolution.claim) {
			await this.refreshTokens.save(replacementRefreshToken);
		}

		return {
			accessToken,
			refreshToken: refresh.token,
			user,
		};
	}

	private async resolveUser(input: {
		googleId: string;
		email: string;
		name: string;
		avatarUrl: string | null;
	}): Promise<GoogleUserResolution> {
		const existingGoogleUser = await this.users.findByGoogleId(input.googleId);

		if (existingGoogleUser) {
			return { user: existingGoogleUser, claim: null };
		}

		const emailVerifiedAt = new Date();
		const existingEmailUser = await this.users.findByEmailForGoogleLink(
			input.email,
		);

		if (existingEmailUser) {
			if (
				existingEmailUser.googleId !== null &&
				existingEmailUser.googleId !== input.googleId
			) {
				throw new BusinessException(
					"GOOGLE_ACCOUNT_LINK_CONFLICT",
					"Google login could not be completed safely.",
					409,
				);
			}

			const linkInput = {
				googleId: input.googleId,
				avatarUrl: input.avatarUrl,
				emailVerifiedAt,
			};

			if (!existingEmailUser.emailVerifiedAt) {
				return {
					user: existingEmailUser,
					claim: { input: linkInput },
				};
			}

			return {
				user: await this.users.linkGoogleAccount(existingEmailUser.id, linkInput),
				claim: null,
			};
		}

		return {
			user: await this.users.createGoogleUserWithDefaultAccount(
				{
					name: input.name,
					email: input.email,
					googleId: input.googleId,
					avatarUrl: input.avatarUrl,
					emailVerifiedAt,
				},
				createDefaultAccountInput(),
			),
			claim: null,
		};
	}
}
