import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import mailConfig from "../../../config/mail.config";
import { buildAppActionLink } from "../../../shared/application/app-action-link";
import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { PasswordResetRepository } from "../../domain/ports/password-reset.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { createRandomToken } from "../services/random-token";
import { ttlToDate } from "../services/ttl-to-date";

export type RequestPasswordResetInput = {
	email: string;
};

@Injectable()
export class RequestPasswordResetUseCase {
	constructor(
		@Inject(AuthUserRepository)
		private readonly users: AuthUserRepository,
		@Inject(PasswordResetRepository)
		private readonly resetTokens: PasswordResetRepository,
		@Inject(TokenDigestService)
		private readonly tokenDigest: TokenDigestService,
		@Inject(MailDeliveryPort)
		private readonly mail: MailDeliveryPort,
		@Inject(mailConfig.KEY)
		private readonly mailSettings: ConfigType<typeof mailConfig>,
	) {}

	async execute(input: RequestPasswordResetInput): Promise<void> {
		const user = await this.users.findByEmail(input.email);

		if (!user) {
			return;
		}

		const now = new Date();
		const token = createRandomToken();
		await this.resetTokens.replaceActiveForUser({
			userId: user.id,
			tokenDigest: this.tokenDigest.digest(token),
			expiresAt: ttlToDate(this.mailSettings.passwordResetTokenTtl ?? "30m", now),
			invalidatedAt: now,
		});

		await this.mail
			.sendPasswordResetEmail({
				to: user.email,
				name: user.name,
				resetUrl: buildAppActionLink(
					this.mailSettings.appPublicUrl,
					"reset-password",
					{ token },
				),
			})
			.catch(() => undefined);
	}
}
