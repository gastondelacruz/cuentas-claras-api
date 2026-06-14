import { Amount } from "../value-objects/amount.vo";
import type { SplitType } from "../value-objects/split-type.vo";
import { ExpenseSplitEntity } from "./expense-split-entity";

export type ExpenseParticipant = {
	memberId: string;
	displayName: string;
};

export type CreateExpenseWithEqualSplitProps = {
	id: string;
	groupId: string;
	title: string;
	amount: Amount;
	currency: string;
	paidByMemberId: string;
	splitType: SplitType;
	category?: string | null;
	notes?: string | null;
	expenseDate: Date;
	participants: ExpenseParticipant[];
};

export type ExpenseEntityProps = {
	id: string;
	groupId: string;
	title: string;
	amount: Amount | number;
	currency: string;
	paidByMemberId: string;
	splitType: SplitType;
	category?: string | null;
	notes?: string | null;
	expenseDate: Date;
	splits: ExpenseSplitEntity[];
	createdAt?: Date;
	updatedAt?: Date;
};

export class ExpenseEntity {
	readonly id: string;
	readonly groupId: string;
	readonly title: string;
	readonly amount: Amount;
	readonly currency: string;
	readonly paidByMemberId: string;
	readonly splitType: SplitType;
	readonly category: string | null;
	readonly notes: string | null;
	readonly expenseDate: Date;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
	private readonly expenseSplits: ExpenseSplitEntity[];

	constructor(props: ExpenseEntityProps) {
		this.id = props.id;
		this.groupId = props.groupId;
		this.title = props.title;
		this.amount =
			props.amount instanceof Amount ? props.amount : new Amount(props.amount);
		this.currency = props.currency;
		this.paidByMemberId = props.paidByMemberId;
		this.splitType = props.splitType;
		this.category = props.category ?? null;
		this.notes = props.notes ?? null;
		this.expenseDate = props.expenseDate;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
		this.expenseSplits = [...props.splits];
	}

	get splits(): ExpenseSplitEntity[] {
		return [...this.expenseSplits];
	}

	get amountValue(): number {
		return this.amount.getValue();
	}

	static createWithEqualSplit(
		props: CreateExpenseWithEqualSplitProps,
	): ExpenseEntity {
		const splits = ExpenseEntity.buildEqualSplits(
			props.amount,
			props.participants,
			props.paidByMemberId,
		);

		return new ExpenseEntity({
			id: props.id,
			groupId: props.groupId,
			title: props.title,
			amount: props.amount,
			currency: props.currency,
			paidByMemberId: props.paidByMemberId,
			splitType: props.splitType,
			category: props.category ?? null,
			notes: props.notes ?? null,
			expenseDate: props.expenseDate,
			splits,
		});
	}

	private static buildEqualSplits(
		amount: Amount,
		participants: ExpenseParticipant[],
		paidByMemberId: string,
	): ExpenseSplitEntity[] {
		if (participants.length === 0) {
			throw new Error("An expense requires at least one participant.");
		}

		const totalCents = amount.getCents();
		const participantCount = participants.length;
		const baseCents = Math.floor(totalCents / participantCount);
		const remainderCents = totalCents - baseCents * participantCount;

		return participants.map((participant, index) => {
			const owedCents = baseCents + (index < remainderCents ? 1 : 0);
			const paidCents = participant.memberId === paidByMemberId ? totalCents : 0;
			const netCents = paidCents - owedCents;

			return new ExpenseSplitEntity({
				memberId: participant.memberId,
				displayName: participant.displayName,
				owedAmount: owedCents / 100,
				paidAmount: paidCents / 100,
				netAmount: netCents / 100,
			});
		});
	}
}
