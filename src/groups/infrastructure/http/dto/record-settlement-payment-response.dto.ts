import { GroupBalancesResponseDto } from "./group-balances-response.dto";

export class SettlementPaymentMemberDto {
	id!: string;
	displayName!: string;
}

export class SettlementPaymentDto {
	id!: string;
	groupId!: string;
	fromMember!: SettlementPaymentMemberDto;
	toMember!: SettlementPaymentMemberDto;
	amount!: number;
	currency!: string;
	paidAt!: string;
	notes!: string | null;
	createdAt!: string;
}

export class RecordSettlementPaymentResponseDto extends GroupBalancesResponseDto {
	payment!: SettlementPaymentDto;
}
