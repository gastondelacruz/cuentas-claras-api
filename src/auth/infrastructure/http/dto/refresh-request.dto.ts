import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshRequestDto {
	@ApiProperty({ description: "The refresh token issued at login or previous refresh" })
	@IsString()
	@IsNotEmpty()
	refreshToken!: string;
}
