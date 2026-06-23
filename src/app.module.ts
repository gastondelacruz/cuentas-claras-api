import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/infrastructure/security/jwt-auth.guard";
import appConfig from "./config/app.config";
import { envValidationSchema } from "./config/env.validation";
import { ExpensesModule } from "./expenses/expenses.module";
import { GroupsModule } from "./groups/groups.module";
import { HealthController } from "./health/health.controller";
import { MeModule } from "./me/me.module";
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
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
