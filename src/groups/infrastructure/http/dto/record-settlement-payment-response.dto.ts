import { ApiProperty } from "@nestjs/swagger";
import { GroupBalancesResponseDto } from "./group-balances-response.dto";

export class SettlementPaymentMemberDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "Ada Lovelace" })
	displayName!: string;
}

export class SettlementPaymentDto {
	@ApiProperty({ example: "770e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "880e8400-e29b-41d4-a716-446655440000" })
	groupId!: string;

	@ApiProperty({ type: SettlementPaymentMemberDto })
	fromMember!: SettlementPaymentMemberDto;

	@ApiProperty({ type: SettlementPaymentMemberDto })
	toMember!: SettlementPaymentMemberDto;

	@ApiProperty({ example: 12500 })
	amount!: number;

	@ApiProperty({ example: "ARS" })
	currency!: string;

	@ApiProperty({ example: "2026-06-29T00:00:00.000Z" })
	paidAt!: string;

	@ApiProperty({ example: "Bank transfer", nullable: true })
	notes!: string | null;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	createdAt!: string;
}

export class RecordSettlementPaymentResponseDto extends GroupBalancesResponseDto {
	@ApiProperty({ type: SettlementPaymentDto })
	payment!: SettlementPaymentDto;
}
