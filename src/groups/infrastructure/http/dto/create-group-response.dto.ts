import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GROUP_TYPES } from "../../../domain/value-objects/group-type.vo";

export class CreateGroupMemberDto {
	@ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id?: string;

	@ApiProperty({ example: "Ada Lovelace" })
	displayName!: string;

	@ApiPropertyOptional({ example: "ada@example.com" })
	email?: string;

	@ApiPropertyOptional({ example: true })
	isCurrentUser?: boolean;

	@ApiPropertyOptional({ example: null, nullable: true })
	removedAt?: Date | string | null;
}

export class CreateGroupResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiPropertyOptional({ example: "Trip to Bariloche" })
	name?: string;

	@ApiPropertyOptional({ example: "Shared travel expenses", nullable: true })
	description?: string | null;

	@ApiPropertyOptional({ enum: GROUP_TYPES, example: "couple" })
	type?: (typeof GROUP_TYPES)[number];

	@ApiPropertyOptional({ example: "ARS" })
	currency?: string;

	@ApiPropertyOptional({ type: [CreateGroupMemberDto] })
	members?: CreateGroupMemberDto[];

	@ApiPropertyOptional({ example: 2 })
	membersCount?: number;

	@ApiPropertyOptional({ example: 3 })
	expensesCount?: number;

	@ApiPropertyOptional({ example: 25000 })
	totalAmount?: number;

	@ApiPropertyOptional({ example: -12500 })
	currentUserBalance?: number;

	@ApiPropertyOptional({ type: [Object] })
	expenses?: unknown[];

	@ApiPropertyOptional({ type: [Object] })
	balances?: unknown[];

	@ApiPropertyOptional({ example: "2026-06-29T10:30:00.000Z" })
	createdAt?: Date | string;

	@ApiPropertyOptional({ example: "2026-06-29T10:30:00.000Z" })
	updatedAt?: Date | string;

	@ApiPropertyOptional({ example: null, nullable: true })
	archivedAt?: Date | string | null;
}
