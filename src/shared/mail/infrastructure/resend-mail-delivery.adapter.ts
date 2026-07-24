import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
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
			subject: "Verifica tu correo electrónico de Cuentas Claras",
			html: buildEmailLayout({
				greeting: `Hola ${escapeHtml(input.name)},`,
				title: "Verifica tu correo electrónico",
				content:
					"Confirma tu correo electrónico para comenzar a disfrutar todas las funcionalidades de Cuentas Claras.",
				ctaLabel: "Verificar correo",
				ctaUrl: input.verificationUrl,
			}),
		});
	}

	async sendGroupInvitationEmail(input: GroupInvitationEmailInput): Promise<void> {
		await this.sendEmail({
			to: input.to,
			subject: `Te han invitado a ${input.groupName}`,
			html: buildEmailLayout({
				greeting: `Hola ${escapeHtml(input.inviteeName)},`,
				title: "Te han invitado a un grupo",
				content: `Has recibido una invitación para unirte al grupo <strong>${escapeHtml(input.groupName)}</strong> en Cuentas Claras.`,
				ctaLabel: "Aceptar la invitación",
				ctaUrl: input.invitationUrl,
			}),
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

type EmailLayoutInput = {
	greeting: string;
	title: string;
	content: string;
	ctaLabel: string;
	ctaUrl: string;
};

function buildEmailLayout(input: EmailLayoutInput): string {
	return `<!doctype html>
<html lang="es">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${input.title}</title>
	</head>
	<body style="margin: 0; padding: 0; background-color: #f4f7f9; color: #24323d; font-family: Arial, Helvetica, sans-serif;">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #f4f7f9;">
			<tr>
				<td align="center" style="padding: 32px 16px;">
					<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px;">
						<tr>
							<td align="center" style="padding: 0 0 24px; color: #1f6f8b; font-size: 24px; font-weight: bold;">
								Cuentas Claras
							</td>
						</tr>
						<tr>
							<td style="padding: 40px 32px; background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 12px;">
								<h1 style="margin: 0 0 24px; color: #24323d; font-size: 24px; line-height: 1.3;">${input.title}</h1>
								<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">${input.greeting}</p>
								<p style="margin: 0 0 28px; font-size: 16px; line-height: 1.6;">${input.content}</p>
								<table role="presentation" cellspacing="0" cellpadding="0" border="0">
									<tr>
										<td style="border-radius: 6px; background-color: #1f6f8b;">
											<a href="${input.ctaUrl}" style="display: inline-block; padding: 14px 24px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">${input.ctaLabel}</a>
										</td>
									</tr>
								</table>
								<p style="margin: 28px 0 0; color: #647481; font-size: 13px; line-height: 1.5;">Si no solicitaste este correo, puedes ignorarlo.</p>
							</td>
						</tr>
						<tr>
							<td align="center" style="padding: 24px 16px 0; color: #647481; font-size: 12px; line-height: 1.5;">
								Este mensaje fue enviado por Cuentas Claras.<br>
								Simplifica tus gastos compartidos.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}
