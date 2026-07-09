import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleLoginRequestDto {
	@ApiProperty({ example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..." })
	@IsString()
	@IsNotEmpty()
	idToken!: string;
}
