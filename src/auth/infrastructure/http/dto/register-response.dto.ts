import { ApiProperty } from "@nestjs/swagger";

export class RegisterUserResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "Ada Lovelace" })
	name!: string;

	@ApiProperty({ example: "ada@example.com" })
	email!: string;
}

export class RegisterResponseDto {
	@ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" })
	accessToken!: string;

	@ApiProperty({ example: "refresh-token" })
	refreshToken!: string;

	@ApiProperty({ type: RegisterUserResponseDto })
	user!: RegisterUserResponseDto;
}
