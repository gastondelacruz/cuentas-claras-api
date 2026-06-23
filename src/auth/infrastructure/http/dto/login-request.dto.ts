import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginRequestDto {
	@ApiProperty()
	@IsEmail()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	email!: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	password!: string;
}
