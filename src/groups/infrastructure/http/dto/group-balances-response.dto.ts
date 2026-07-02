import { ApiProperty } from "@nestjs/swagger";

export class GroupBalanceDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	memberId!: string;

	@ApiProperty({ example: "Ada Lovelace" })
	displayName!: string;

	@ApiProperty({ example: 12500 })
	balance!: number;

	@ApiProperty({ example: "ARS" })
	currency!: string;
}

export class GroupBalancesResponseDto {
	@ApiProperty({ type: [GroupBalanceDto] })
	balances!: GroupBalanceDto[];
}
