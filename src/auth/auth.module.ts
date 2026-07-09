import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import authConfig from "../config/auth.config";
import mailConfig from "../config/mail.config";
import { MailModule } from "../shared/mail/mail.module";
import { GetEmailVerificationStatusUseCase } from "./application/use-cases/get-email-verification-status.use-case";
import { GoogleLoginUseCase } from "./application/use-cases/google-login.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { RefreshTokenUseCase } from "./application/use-cases/refresh.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { ResendEmailVerificationUseCase } from "./application/use-cases/resend-email-verification.use-case";
import { VerifyEmailUseCase } from "./application/use-cases/verify-email.use-case";
import { AuthUserRepository } from "./domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "./domain/ports/email-verification-token.repository";
import { GoogleTokenVerifier } from "./domain/ports/google-token-verifier";
import { PasswordHasher } from "./domain/ports/password-hasher";
import { RefreshTokenRepository } from "./domain/ports/refresh-token.repository";
import { TokenDigestService } from "./domain/ports/token-digest.service";
import { TokenService } from "./domain/ports/token.service";
import { AuthController } from "./infrastructure/http/auth.controller";
import { PrismaAuthUserRepository } from "./infrastructure/persistence/prisma-auth-user.repository";
import { PrismaEmailVerificationTokenRepository } from "./infrastructure/persistence/prisma-email-verification-token.repository";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma-refresh-token.repository";
import { Argon2PasswordHasher } from "./infrastructure/security/argon2-password-hasher";
import { GoogleAuthLibraryTokenVerifier } from "./infrastructure/security/google-auth-library-token-verifier";
import { HmacTokenDigestService } from "./infrastructure/security/hmac-token-digest.service";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";

@Module({
	imports: [
		ConfigModule.forFeature(authConfig),
		ConfigModule.forFeature(mailConfig),
		MailModule,
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.register({}),
	],
	controllers: [AuthController],
	providers: [
		RegisterUseCase,
		LoginUseCase,
		GoogleLoginUseCase,
		RefreshTokenUseCase,
		LogoutUseCase,
		VerifyEmailUseCase,
		ResendEmailVerificationUseCase,
		GetEmailVerificationStatusUseCase,
		Argon2PasswordHasher,
		GoogleAuthLibraryTokenVerifier,
		JwtTokenService,
		JwtStrategy,
		HmacTokenDigestService,
		PrismaAuthUserRepository,
		PrismaRefreshTokenRepository,
		PrismaEmailVerificationTokenRepository,
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
			provide: GoogleTokenVerifier,
			useExisting: GoogleAuthLibraryTokenVerifier,
		},
		{
			provide: AuthUserRepository,
			useExisting: PrismaAuthUserRepository,
		},
		{
			provide: RefreshTokenRepository,
			useExisting: PrismaRefreshTokenRepository,
		},
		{
			provide: EmailVerificationTokenRepository,
			useExisting: PrismaEmailVerificationTokenRepository,
		},
	],
	exports: [
		PassportModule,
		JwtModule,
		JwtStrategy,
		AuthUserRepository,
		TokenDigestService,
	],
})
export class AuthModule {}
