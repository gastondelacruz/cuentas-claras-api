import { ApiPropertyOptional } from "@nestjs/swagger";
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

export class UpdateExpenseRequestDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	title?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	@IsPositive()
	amount?: number;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@Matches(/^[A-Z]{3}$/)
	@Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
	currency?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	paidByMemberId?: string;

	@ApiPropertyOptional({ type: [String] })
	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@ArrayUnique()
	@IsUUID("all", { each: true })
	participantMemberIds?: string[];

	@ApiPropertyOptional({ enum: SPLIT_TYPES })
	@IsOptional()
	@IsIn(SPLIT_TYPES)
	splitType?: SplitType;

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

	@ApiPropertyOptional()
	@IsOptional()
	@IsDateString()
	expenseDate?: string;
}
