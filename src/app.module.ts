import { Module } from "@nestjs/common";
import { ConfigModule, type ConfigType } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/infrastructure/security/jwt-auth.guard";
import appConfig from "./config/app.config";
import { envValidationSchema } from "./config/env.validation";
import rateLimitConfig from "./config/rate-limit.config";
import { ExpensesModule } from "./expenses/expenses.module";
import { GroupsModule } from "./groups/groups.module";
import { HealthController } from "./health/health.controller";
import { MeModule } from "./me/me.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [appConfig, rateLimitConfig],
			validationSchema: envValidationSchema,
			validationOptions: {
				abortEarly: false,
			},
		}),
		ThrottlerModule.forRootAsync({
			inject: [rateLimitConfig.KEY],
			useFactory: (config: ConfigType<typeof rateLimitConfig>) => ({
				throttlers: [
					{
						name: "default",
						limit: config.default.limit,
						ttl: config.default.ttl,
					},
				],
			}),
		}),
		AuthModule,
		GroupsModule,
		ExpensesModule,
		MeModule,
		PrismaModule,
	],
	controllers: [HealthController],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
