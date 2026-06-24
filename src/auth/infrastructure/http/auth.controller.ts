import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiNoContentResponse, ApiOkResponse, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Public } from "../../../shared/decorators/public.decorator";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../../application/use-cases/refresh.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LogoutRequestDto } from "./dto/logout-request.dto";
import { RefreshRequestDto } from "./dto/refresh-request.dto";
import { RefreshResponseDto } from "./dto/refresh-response.dto";
import { RegisterRequestDto } from "./dto/register-request.dto";
import { RegisterResponseDto } from "./dto/register-response.dto";
import { AuthMapper } from "./mappers/auth.mapper";
import type { JwtRequestUser } from "../security/jwt.strategy";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
	constructor(
		private readonly registerUseCase: RegisterUseCase,
		private readonly loginUseCase: LoginUseCase,
		private readonly refreshTokenUseCase: RefreshTokenUseCase,
		private readonly logoutUseCase: LogoutUseCase,
	) {}

	@Post("register")
	@Public()
	@ApiCreatedResponse({ type: RegisterResponseDto })
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
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({ type: RegisterResponseDto })
	async login(@Body() body: LoginRequestDto): Promise<RegisterResponseDto> {
		const result = await this.loginUseCase.execute(
			AuthMapper.toLoginInput(body),
		);

		return AuthMapper.toLoginResponseDto(result);
	}

	@Post("refresh")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({ type: RefreshResponseDto })
	async refresh(@Body() body: RefreshRequestDto): Promise<RefreshResponseDto> {
		const result = await this.refreshTokenUseCase.execute(
			AuthMapper.toRefreshInput(body),
		);

		return AuthMapper.toRefreshResponseDto(result);
	}

	@Post("logout")
	@HttpCode(HttpStatus.NO_CONTENT)
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
}
