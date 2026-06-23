import type {
	LoginInput,
	LoginResult,
} from "../../../application/use-cases/login.use-case";
import type {
	RegisterInput,
	RegisterResult,
} from "../../../application/use-cases/register.use-case";
import { LoginRequestDto } from "../dto/login-request.dto";
import { RegisterRequestDto } from "../dto/register-request.dto";
import { RegisterResponseDto } from "../dto/register-response.dto";

export class AuthMapper {
	static toRegisterInput(dto: RegisterRequestDto): RegisterInput {
		return {
			name: dto.name,
			email: dto.email,
			password: dto.password,
		};
	}

	static toRegisterResponseDto(result: RegisterResult): RegisterResponseDto {
		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
			user: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
			},
		};
	}

	static toLoginInput(dto: LoginRequestDto): LoginInput {
		return {
			email: dto.email,
			password: dto.password,
		};
	}

	static toLoginResponseDto(result: LoginResult): RegisterResponseDto {
		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
			user: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
			},
		};
	}
}
