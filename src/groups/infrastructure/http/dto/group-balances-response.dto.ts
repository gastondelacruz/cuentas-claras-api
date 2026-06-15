export class GroupBalanceDto {
	memberId!: string;
	displayName!: string;
	balance!: number;
	currency!: string;
}

export class GroupBalancesResponseDto {
	balances!: GroupBalanceDto[];
}
