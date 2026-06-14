export type ExpenseSplitEntityProps = {
	memberId: string;
	displayName?: string | null;
	owedAmount: number;
	paidAmount: number;
	netAmount: number;
};

export class ExpenseSplitEntity {
	readonly memberId: string;
	readonly displayName: string | null;
	readonly owedAmount: number;
	readonly paidAmount: number;
	readonly netAmount: number;

	constructor(props: ExpenseSplitEntityProps) {
		this.memberId = props.memberId;
		this.displayName = props.displayName ?? null;
		this.owedAmount = props.owedAmount;
		this.paidAmount = props.paidAmount;
		this.netAmount = props.netAmount;
	}
}
