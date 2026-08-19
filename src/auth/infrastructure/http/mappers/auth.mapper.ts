import type {
	LoginInput,
	LoginResult,
} from "../../../application/use-cases/login.use-case";
import type {
	RegisterInput,
	RegisterResult,
} from "../../../application/use-cases/register.use-case";
import type {
	RefreshInput,
	RefreshResult,
} from "../../../application/use-cases/refresh.use-case";
import type { RequestPasswordResetInput } from "../../../application/use-cases/request-password-reset.use-case";
import type { ResetPasswordInput } from "../../../application/use-cases/reset-password.use-case";
import type { LoginRequestDto } from "../dto/login-request.dto";
import type { RefreshRequestDto } from "../dto/refresh-request.dto";
import type { RefreshResponseDto } from "../dto/refresh-response.dto";
import type { RegisterRequestDto } from "../dto/register-request.dto";
import type { RegisterResponseDto } from "../dto/register-response.dto";
import type { RequestPasswordResetDto } from "../dto/request-password-reset.dto";
import type { ResetPasswordDto } from "../dto/reset-password.dto";

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

	static toRefreshInput(dto: RefreshRequestDto): RefreshInput {
		return {
			refreshToken: dto.refreshToken,
		};
	}

	static toRefreshResponseDto(result: RefreshResult): RefreshResponseDto {
		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
		};
	}

	static toRequestPasswordResetInput(
		dto: RequestPasswordResetDto,
	): RequestPasswordResetInput {
		return { email: dto.email };
	}

	static toResetPasswordInput(dto: ResetPasswordDto): ResetPasswordInput {
		return {
			token: dto.token,
			password: dto.password,
		};
	}
}
