import { registerAs } from "@nestjs/config";
import type { TtlString } from "./auth.config";

export type MailProvider = "noop" | "resend";

export type MailConfig = {
	provider: MailProvider;
	from: string;
	appPublicUrl: string;
	verificationTokenTtl: TtlString;
	invitationTokenTtl: TtlString;
	resendApiKey?: string;
};

export default registerAs(
	"mail",
	(): MailConfig => ({
		provider: (process.env.MAIL_PROVIDER ?? "noop") as MailProvider,
		from: process.env.MAIL_FROM ?? "Cuentas Claras <noreply@example.com>",
		appPublicUrl: process.env.APP_PUBLIC_URL ?? "http://localhost:3000",
		verificationTokenTtl: (process.env.EMAIL_VERIFICATION_TOKEN_TTL ?? "24h") as TtlString,
		invitationTokenTtl: (process.env.GROUP_INVITATION_TOKEN_TTL ?? "7d") as TtlString,
		resendApiKey: process.env.RESEND_API_KEY,
	}),
);
