import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
	IsDateString,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Matches,
	MaxLength,
	IsPositive,
} from "class-validator";

export class RecordSettlementPaymentRequestDto {
	@ApiProperty()
	@IsUUID()
	fromMemberId!: string;

	@ApiProperty()
	@IsUUID()
	toMemberId!: string;

	@ApiProperty()
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount!: number;

	@ApiProperty()
	@IsString()
	@Matches(/^[A-Z]{3}$/)
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	currency!: string;

	@ApiProperty()
	@IsDateString()
	paidAt!: string;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	notes?: string | null;
}
