import { ApiProperty } from "@nestjs/swagger";

export class SettlementItemDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	fromMemberId!: string;

	@ApiProperty({ example: "Ada Lovelace" })
	fromMemberName!: string;

	@ApiProperty({ example: "660e8400-e29b-41d4-a716-446655440000" })
	toMemberId!: string;

	@ApiProperty({ example: "Grace Hopper" })
	toMemberName!: string;

	@ApiProperty({ example: 12500 })
	amount!: number;

	@ApiProperty({ example: "ARS" })
	currency!: string;
}

export class GroupSettlementsResponseDto {
	@ApiProperty({ type: [SettlementItemDto] })
	settlements!: SettlementItemDto[];
}
