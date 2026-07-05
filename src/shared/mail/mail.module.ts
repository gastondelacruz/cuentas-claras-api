import { Module } from "@nestjs/common";
import { ConfigModule, type ConfigType } from "@nestjs/config";
import mailConfig from "../../config/mail.config";
import { MailDeliveryPort } from "./domain/ports/mail-delivery.port";
import { NoopMailDeliveryAdapter } from "./infrastructure/noop-mail-delivery.adapter";
import { ResendMailDeliveryAdapter } from "./infrastructure/resend-mail-delivery.adapter";

@Module({
	imports: [ConfigModule.forFeature(mailConfig)],
	providers: [
		NoopMailDeliveryAdapter,
		ResendMailDeliveryAdapter,
		{
			provide: MailDeliveryPort,
			inject: [mailConfig.KEY, NoopMailDeliveryAdapter, ResendMailDeliveryAdapter],
			useFactory: (
				config: ConfigType<typeof mailConfig>,
				noop: NoopMailDeliveryAdapter,
				resend: ResendMailDeliveryAdapter,
			) => (config.provider === "resend" ? resend : noop),
		},
	],
	exports: [MailDeliveryPort, NoopMailDeliveryAdapter],
})
export class MailModule {}
