import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EmailVerificationStatusResponseDto {
	@ApiProperty()
	verified!: boolean;

	@ApiPropertyOptional({ nullable: true })
	verifiedAt!: string | null;
}
