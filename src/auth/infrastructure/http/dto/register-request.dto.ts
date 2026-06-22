import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterRequestDto {
	@ApiProperty()
	@IsEmail()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	email!: string;

	@ApiProperty({ minLength: 8 })
	@IsString()
	@MinLength(8)
	password!: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	name!: string;
}
