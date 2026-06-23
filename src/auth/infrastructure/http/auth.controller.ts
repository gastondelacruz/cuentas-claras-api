import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOkResponse, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginRequestDto } from "./dto/login-request.dto";
import { RegisterRequestDto } from "./dto/register-request.dto";
import { RegisterResponseDto } from "./dto/register-response.dto";
import { AuthMapper } from "./mappers/auth.mapper";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
	constructor(
		private readonly registerUseCase: RegisterUseCase,
		private readonly loginUseCase: LoginUseCase,
	) {}

	@Post("register")
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
	@HttpCode(HttpStatus.OK)
	@ApiOkResponse({ type: RegisterResponseDto })
	async login(@Body() body: LoginRequestDto): Promise<RegisterResponseDto> {
		const result = await this.loginUseCase.execute(
			AuthMapper.toLoginInput(body),
		);

		return AuthMapper.toLoginResponseDto(result);
	}
}
