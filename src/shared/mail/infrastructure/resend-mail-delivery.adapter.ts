import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import mailConfig from "../../../config/mail.config";
import {
	MailDeliveryPort,
	type GroupInvitationEmailInput,
	type VerificationEmailInput,
} from "../domain/ports/mail-delivery.port";

@Injectable()
export class ResendMailDeliveryAdapter extends MailDeliveryPort {
	constructor(
		@Inject(mailConfig.KEY)
		private readonly config: ConfigType<typeof mailConfig>,
	) {
		super();
	}

	async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
		await this.sendEmail({
			to: input.to,
			subject: "Verify your Cuentas Claras email",
			html: `<p>Hi ${escapeHtml(input.name)},</p><p>Verify your email to unlock Cuentas Claras features.</p><p><a href="${input.verificationUrl}">Verify email</a></p>`,
		});
	}

	async sendGroupInvitationEmail(input: GroupInvitationEmailInput): Promise<void> {
		await this.sendEmail({
			to: input.to,
			subject: `You're invited to ${input.groupName}`,
			html: `<p>Hi ${escapeHtml(input.inviteeName)},</p><p>You were invited to ${escapeHtml(input.groupName)} in Cuentas Claras.</p><p><a href="${input.invitationUrl}">Accept invitation</a></p>`,
		});
	}

	private async sendEmail(input: { to: string; subject: string; html: string }) {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.config.resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: this.config.from,
				to: input.to,
				subject: input.subject,
				html: input.html,
			}),
		});

		if (!response.ok) {
			throw new Error("MAIL_DELIVERY_FAILED");
		}
	}
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}
