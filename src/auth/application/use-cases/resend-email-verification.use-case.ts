import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import mailConfig from "../../../config/mail.config";
import { buildAppActionLink } from "../../../shared/application/app-action-link";
import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { createRandomToken } from "../services/random-token";
import { ttlToDate } from "../services/ttl-to-date";

export type ResendEmailVerificationInput = {
	userId: string;
};

@Injectable()
export class ResendEmailVerificationUseCase {
	constructor(
		private readonly users: AuthUserRepository,
		private readonly verificationTokens: EmailVerificationTokenRepository,
		private readonly tokenDigest: TokenDigestService,
		private readonly mail: MailDeliveryPort,
		@Inject(mailConfig.KEY)
		private readonly mailSettings: ConfigType<typeof mailConfig>,
	) {}

	async execute(input: ResendEmailVerificationInput): Promise<void> {
		const user = await this.users.findById(input.userId);

		if (!user || user.emailVerifiedAt) {
			return;
		}

		const token = createRandomToken();
		await this.verificationTokens.invalidateActiveForUser(user.id, new Date());
		await this.verificationTokens.save({
			userId: user.id,
			tokenDigest: this.tokenDigest.digest(token),
			expiresAt: ttlToDate(this.mailSettings.verificationTokenTtl),
		});

		await this.mail.sendVerificationEmail({
			to: user.email,
			name: user.name,
			verificationUrl: buildAppActionLink(this.mailSettings.appPublicUrl, "verify-email", { token }),
		}).catch(() => undefined);
	}
}
