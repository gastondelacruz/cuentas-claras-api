import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import authConfig from "../config/auth.config";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { AuthUserRepository } from "./domain/ports/auth-user.repository";
import { PasswordHasher } from "./domain/ports/password-hasher";
import { RefreshTokenRepository } from "./domain/ports/refresh-token.repository";
import { TokenService } from "./domain/ports/token.service";
import { AuthController } from "./infrastructure/http/auth.controller";
import { PrismaAuthUserRepository } from "./infrastructure/persistence/prisma-auth-user.repository";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma-refresh-token.repository";
import { Argon2PasswordHasher } from "./infrastructure/security/argon2-password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";

@Module({
	imports: [ConfigModule.forFeature(authConfig), JwtModule.register({})],
	controllers: [AuthController],
	providers: [
		RegisterUseCase,
		LoginUseCase,
		Argon2PasswordHasher,
		JwtTokenService,
		PrismaAuthUserRepository,
		PrismaRefreshTokenRepository,
		{
			provide: PasswordHasher,
			useExisting: Argon2PasswordHasher,
		},
		{
			provide: TokenService,
			useExisting: JwtTokenService,
		},
		{
			provide: AuthUserRepository,
			useExisting: PrismaAuthUserRepository,
		},
		{
			provide: RefreshTokenRepository,
			useExisting: PrismaRefreshTokenRepository,
		},
	],
})
export class AuthModule {}
