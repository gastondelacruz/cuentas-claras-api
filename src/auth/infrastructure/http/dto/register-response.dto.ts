export class RegisterUserResponseDto {
	id!: string;
	name!: string;
	email!: string;
}

export class RegisterResponseDto {
	accessToken!: string;
	refreshToken!: string;
	user!: RegisterUserResponseDto;
}
