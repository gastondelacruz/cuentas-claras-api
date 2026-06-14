import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
	ArrayNotEmpty,
	ArrayUnique,
	IsArray,
	IsDateString,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
	Matches,
} from "class-validator";
import {
	SPLIT_TYPES,
	type SplitType,
} from "../../../domain/value-objects/split-type.vo";

export class CreateExpenseRequestDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	title!: string;

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
	@IsUUID()
	paidByMemberId!: string;

	@ApiProperty({ type: [String] })
	@IsArray()
	@ArrayNotEmpty()
	@ArrayUnique()
	@IsUUID("all", { each: true })
	participantMemberIds!: string[];

	@ApiProperty({ enum: SPLIT_TYPES })
	@IsIn(SPLIT_TYPES)
	splitType!: SplitType;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	category?: string | null;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	notes?: string | null;

	@ApiProperty()
	@IsDateString()
	expenseDate!: string;
}
