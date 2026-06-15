export class SettlementItemDto {
	fromMemberId!: string;
	fromMemberName!: string;
	toMemberId!: string;
	toMemberName!: string;
	amount!: number;
	currency!: string;
}

export class GroupSettlementsResponseDto {
	settlements!: SettlementItemDto[];
}
