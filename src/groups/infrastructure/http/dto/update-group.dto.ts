import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
	IsArray,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	ValidateIf,
	ValidateNested,
} from "class-validator";
import { GROUP_TYPES } from "../../../domain/entities/group-type";
import { CreateGroupMemberDto } from "./create-group.dto";
import { AtLeastOneField } from "../validators/at-least-one-field.validator";

	export class UpdateGroupDto {
	@ApiPropertyOptional()
	@ValidateIf((_, value) => value !== undefined)
	@IsString()
	@IsNotEmpty()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	name?: string;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	description?: string | null;

	@ApiPropertyOptional({ enum: GROUP_TYPES })
	@ValidateIf((_, value) => value !== undefined)
	@IsString()
	@IsIn(GROUP_TYPES)
	type?: (typeof GROUP_TYPES)[number];

	@ApiPropertyOptional()
	@ValidateIf((_, value) => value !== undefined)
	@IsString()
	@Matches(/^[A-Z]{3}$/)
	@Transform(({ value }) =>
		typeof value === "string" ? value.trim() : value,
	)
	currency?: string;

	@ApiPropertyOptional({ type: () => [CreateGroupMemberDto] })
	@ValidateIf((_, value) => value !== undefined)
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateGroupMemberDto)
	members?: CreateGroupMemberDto[];

	@AtLeastOneField()
	readonly atLeastOneField?: string;
}
