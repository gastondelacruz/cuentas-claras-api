import { Body, Controller, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { RegisterRequestDto } from "./dto/register-request.dto";
import { RegisterResponseDto } from "./dto/register-response.dto";
import { AuthMapper } from "./mappers/auth.mapper";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
	constructor(private readonly registerUseCase: RegisterUseCase) {}

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
}
