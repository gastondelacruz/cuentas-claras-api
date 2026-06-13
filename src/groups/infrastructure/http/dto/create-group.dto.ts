import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
	ArrayMinSize,
	IsArray,
	IsEmail,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	ValidateIf,
	ValidateNested,
} from "class-validator";
import { GROUP_TYPES } from "../../../domain/entities/group-type";

export class CreateGroupMemberDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	displayName!: string;

	@ApiPropertyOptional()
	@ValidateIf((_, value) => value !== undefined)
	@IsEmail()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim().toLowerCase() : value,
	)
	email?: string;
}

export class CreateGroupDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	name!: string;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	description?: string | null;

	@ApiProperty({ enum: GROUP_TYPES })
	@IsString()
	@IsIn(GROUP_TYPES)
	type!: (typeof GROUP_TYPES)[number];

	@ApiProperty()
	@IsString()
	@Matches(/^[A-Z]{3}$/)
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	currency!: string;

	@ApiPropertyOptional({ type: () => [CreateGroupMemberDto] })
	@ValidateIf((_, value) => value !== undefined)
	@IsArray()
	@ArrayMinSize(0)
	@ValidateNested({ each: true })
	@Type(() => CreateGroupMemberDto)
	members?: CreateGroupMemberDto[];
}
