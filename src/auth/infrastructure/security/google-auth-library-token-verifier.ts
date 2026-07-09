import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import authConfig from "../../../config/auth.config";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	GoogleTokenVerifier,
	type GoogleTokenClaims,
} from "../../domain/ports/google-token-verifier";

@Injectable()
export class GoogleAuthLibraryTokenVerifier extends GoogleTokenVerifier {
	private readonly client: OAuth2Client;

	constructor(
		@Inject(authConfig.KEY)
		private readonly config: Pick<ConfigType<typeof authConfig>, "googleClientId">,
	) {
		super();
		this.client = new OAuth2Client(config.googleClientId);
	}

	async verifyIdToken(idToken: string): Promise<GoogleTokenClaims> {
		if (!this.config.googleClientId) {
			throw new BusinessException(
				"GOOGLE_LOGIN_NOT_CONFIGURED",
				"Google login is not configured.",
				503,
			);
		}

		try {
			const ticket = await this.client.verifyIdToken({
				idToken,
				audience: this.config.googleClientId,
			});
			const payload = ticket.getPayload();

			if (!payload?.sub || !payload.email) {
				throw new BusinessException(
					"GOOGLE_TOKEN_MISSING_CLAIMS",
					"Google token is missing required claims.",
					401,
				);
			}

			return {
				googleId: payload.sub,
				email: payload.email.trim().toLowerCase(),
				emailVerified: payload.email_verified === true,
				name: payload.name?.trim() || payload.email.trim().toLowerCase(),
				avatarUrl: payload.picture ?? null,
			};
		} catch (error) {
			if (error instanceof BusinessException) {
				throw error;
			}

			if (this.isProviderUnavailable(error)) {
				throw new BusinessException(
					"GOOGLE_LOGIN_UNAVAILABLE",
					"Google login is temporarily unavailable.",
					503,
				);
			}

			throw new BusinessException(
				"INVALID_GOOGLE_TOKEN",
				"Invalid Google token.",
				401,
			);
		}
	}

	private isProviderUnavailable(error: unknown): boolean {
		if (typeof error !== "object" || error === null) {
			return false;
		}

		const transportCodes = new Set([
			"EAI_AGAIN",
			"ECONNREFUSED",
			"ECONNRESET",
			"ENETUNREACH",
			"ENOTFOUND",
			"EPIPE",
			"ETIMEDOUT",
			"UND_ERR_CONNECT_TIMEOUT",
		]);
		const code = "code" in error ? error.code : undefined;

		if (typeof code === "string" && transportCodes.has(code)) {
			return true;
		}

		const response = "response" in error ? error.response : undefined;

		if (typeof response === "object" && response !== null) {
			const status = "status" in response ? response.status : undefined;

			if (
				typeof status === "number" &&
				(status === 429 || status >= 500)
			) {
				return true;
			}
		}

		const cause = "cause" in error ? error.cause : undefined;
		return cause !== error && this.isProviderUnavailable(cause);
	}
}
