import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig from "./config/app.config";
import { envValidationSchema } from "./config/env.validation";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [appConfig],
			validationSchema: envValidationSchema,
			validationOptions: {
				abortEarly: false,
			},
		}),
		PrismaModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
