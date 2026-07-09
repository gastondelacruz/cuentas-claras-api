import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiBody, ApiNoContentResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { AllowUnverified } from "../../../shared/decorators/allow-unverified.decorator";
import { Public } from "../../../shared/decorators/public.decorator";
import { getAuthRateLimit } from "../../../config/rate-limit.config";
import {
	ApiCreatedDataResponse,
	ApiOkDataResponse,
} from "../../../shared/swagger/api-envelope-response.decorator";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { GetEmailVerificationStatusUseCase } from "../../application/use-cases/get-email-verification-status.use-case";
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { ResendEmailVerificationUseCase } from "../../application/use-cases/resend-email-verification.use-case";
import { VerifyEmailUseCase } from "../../application/use-cases/verify-email.use-case";
import { EmailVerificationStatusResponseDto } from "./dto/email-verification-status-response.dto";
import { GoogleLoginRequestDto } from "./dto/google-login-request.dto";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LogoutRequestDto } from "./dto/logout-request.dto";
import { RefreshRequestDto } from "./dto/refresh-request.dto";
import { RefreshResponseDto } from "./dto/refresh-response.dto";
import { RegisterRequestDto } from "./dto/register-request.dto";
import { RegisterResponseDto } from "./dto/register-response.dto";
import { VerifyEmailRequestDto } from "./dto/verify-email-request.dto";
import { AuthMapper } from "./mappers/auth.mapper";
import type { JwtRequestUser } from "../security/jwt.strategy";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
	constructor(
		@Inject(RegisterUseCase)
		private readonly registerUseCase: RegisterUseCase,
		@Inject(LoginUseCase)
		private readonly loginUseCase: LoginUseCase,
		@Inject(GoogleLoginUseCase)
		private readonly googleLoginUseCase: GoogleLoginUseCase,
		@Inject(RefreshTokenUseCase)
		private readonly refreshTokenUseCase: RefreshTokenUseCase,
		@Inject(LogoutUseCase)
		private readonly logoutUseCase: LogoutUseCase,
		@Inject(VerifyEmailUseCase)
		private readonly verifyEmailUseCase: VerifyEmailUseCase,
		@Inject(ResendEmailVerificationUseCase)
		private readonly resendEmailVerificationUseCase: ResendEmailVerificationUseCase,
		@Inject(GetEmailVerificationStatusUseCase)
		private readonly getEmailVerificationStatusUseCase: GetEmailVerificationStatusUseCase,
	) {}

	@Post("register")
	@Public()
	@Throttle({ default: getAuthRateLimit() })
	@ApiBody({ type: RegisterRequestDto })
	@ApiCreatedDataResponse({ type: RegisterResponseDto })
	async register(
		@Body() body: RegisterRequestDto,
	): Promise<RegisterResponseDto> {
		const result = await this.registerUseCase.execute(
			AuthMapper.toRegisterInput(body),
		);

		return AuthMapper.toRegisterResponseDto(result);
	}

	@Post("login")
	@Public()
	@Throttle({ default: getAuthRateLimit() })
	@HttpCode(HttpStatus.OK)
	@ApiBody({ type: LoginRequestDto })
	@ApiOkDataResponse({ type: RegisterResponseDto })
	async login(@Body() body: LoginRequestDto): Promise<RegisterResponseDto> {
		const result = await this.loginUseCase.execute(
			AuthMapper.toLoginInput(body),
		);

		return AuthMapper.toLoginResponseDto(result);
	}

	@Post("google")
	@Public()
	@Throttle({ default: getAuthRateLimit() })
	@HttpCode(HttpStatus.OK)
	@ApiBody({ type: GoogleLoginRequestDto })
	@ApiOkDataResponse({ type: RegisterResponseDto })
	async googleLogin(
		@Body() body: GoogleLoginRequestDto,
	): Promise<RegisterResponseDto> {
		const result = await this.googleLoginUseCase.execute(
			AuthMapper.toGoogleLoginInput(body),
		);

		return AuthMapper.toGoogleLoginResponseDto(result);
	}

	@Post("refresh")
	@Public()
	@Throttle({ default: getAuthRateLimit() })
	@HttpCode(HttpStatus.OK)
	@ApiBody({ type: RefreshRequestDto })
	@ApiOkDataResponse({ type: RefreshResponseDto })
	async refresh(@Body() body: RefreshRequestDto): Promise<RefreshResponseDto> {
		const result = await this.refreshTokenUseCase.execute(
			AuthMapper.toRefreshInput(body),
		);

		return AuthMapper.toRefreshResponseDto(result);
	}

	@Post("logout")
	@AllowUnverified()
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBody({ type: LogoutRequestDto })
	@ApiNoContentResponse({ description: "Logged out successfully." })
	async logout(
		@Body() dto: LogoutRequestDto,
		@CurrentUser() user: JwtRequestUser,
	): Promise<void> {
		await this.logoutUseCase.execute({
			refreshToken: dto.refreshToken,
			userId: user.userId,
		});
	}

	@Post("email-verification/verify")
	@Public()
	@Throttle({ default: getAuthRateLimit() })
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiBody({ type: VerifyEmailRequestDto })
	async verifyEmail(@Body() body: VerifyEmailRequestDto): Promise<void> {
		await this.verifyEmailUseCase.execute({ token: body.token });
	}

	@Post("email-verification/resend")
	@AllowUnverified()
	@Throttle({ default: getAuthRateLimit() })
	@HttpCode(HttpStatus.NO_CONTENT)
	async resendEmailVerification(@CurrentUser() user: JwtRequestUser): Promise<void> {
		await this.resendEmailVerificationUseCase.execute({ userId: user.userId });
	}

	@Get("email-verification/status")
	@AllowUnverified()
	@ApiOkDataResponse({ type: EmailVerificationStatusResponseDto })
	async emailVerificationStatus(
		@CurrentUser() user: JwtRequestUser,
	): Promise<EmailVerificationStatusResponseDto> {
		const status = await this.getEmailVerificationStatusUseCase.execute(user.userId);

		return {
			verified: status.verified,
			verifiedAt: status.verifiedAt?.toISOString() ?? null,
		};
	}
}
