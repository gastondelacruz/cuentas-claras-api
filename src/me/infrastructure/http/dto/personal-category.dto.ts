import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsIn,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from "class-validator";
import {
	PERSONAL_CATEGORY_ICONS,
	PERSONAL_CATEGORY_RESPONSE_ICONS,
} from "../../../domain/value-objects/personal-category.vo";
import { TRANSACTION_TYPES } from "../../../domain/value-objects/transaction-type.vo";

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/u;

export class PersonalCategoryResponseDto {
	@ApiProperty() id!: string;
	@ApiProperty() name!: string;
	@ApiProperty({ enum: TRANSACTION_TYPES }) type!: string;
	@ApiProperty({ enum: PERSONAL_CATEGORY_RESPONSE_ICONS }) icon!: string;
	@ApiProperty({ pattern: "^#[0-9A-Fa-f]{6}$" }) color!: string;
	@ApiProperty() isDefault!: boolean;
	@ApiProperty() userId!: string;
	@ApiProperty({ nullable: true, type: String, format: "date-time" })
	createdAt!: Date | null;
	@ApiProperty({ nullable: true, type: String, format: "date-time" })
	updatedAt!: Date | null;
}

export class CreatePersonalCategoryRequestDto {
	@ApiProperty() @IsString() @MinLength(1) @MaxLength(50) name!: string;
	@ApiProperty({ enum: TRANSACTION_TYPES })
	@IsIn(TRANSACTION_TYPES)
	type!: "expense" | "income";
	@ApiProperty({ enum: PERSONAL_CATEGORY_ICONS })
	@IsIn(PERSONAL_CATEGORY_ICONS)
	icon!: string;
	@ApiProperty({ pattern: "^#[0-9A-Fa-f]{6}$" })
	@IsString()
	@Matches(COLOR_PATTERN)
	color!: string;
}

export class UpdatePersonalCategoryRequestDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(50)
	name?: string;
	@ApiPropertyOptional({ enum: PERSONAL_CATEGORY_ICONS })
	@IsOptional()
	@IsIn(PERSONAL_CATEGORY_ICONS)
	icon?: string;
	@ApiPropertyOptional({ pattern: "^#[0-9A-Fa-f]{6}$" })
	@IsOptional()
	@IsString()
	@Matches(COLOR_PATTERN)
	color?: string;
}
