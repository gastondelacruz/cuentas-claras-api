import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
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
})
export class AppModule {}
