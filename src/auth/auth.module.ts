import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import authConfig from "../config/auth.config";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { RefreshTokenUseCase } from "./application/use-cases/refresh.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { AuthUserRepository } from "./domain/ports/auth-user.repository";
import { PasswordHasher } from "./domain/ports/password-hasher";
import { RefreshTokenRepository } from "./domain/ports/refresh-token.repository";
import { TokenDigestService } from "./domain/ports/token-digest.service";
import { TokenService } from "./domain/ports/token.service";
import { AuthController } from "./infrastructure/http/auth.controller";
import { PrismaAuthUserRepository } from "./infrastructure/persistence/prisma-auth-user.repository";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma-refresh-token.repository";
import { Argon2PasswordHasher } from "./infrastructure/security/argon2-password-hasher";
import { HmacTokenDigestService } from "./infrastructure/security/hmac-token-digest.service";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";

@Module({
	imports: [
		ConfigModule.forFeature(authConfig),
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.register({}),
	],
	controllers: [AuthController],
	providers: [
		RegisterUseCase,
		LoginUseCase,
		RefreshTokenUseCase,
		LogoutUseCase,
		Argon2PasswordHasher,
		JwtTokenService,
		JwtStrategy,
		HmacTokenDigestService,
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
			provide: TokenDigestService,
			useExisting: HmacTokenDigestService,
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
	exports: [PassportModule, JwtModule, JwtStrategy],
})
export class AuthModule {}
