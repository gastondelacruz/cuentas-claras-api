import type { ExpenseEntity } from "../entities/expense-entity";

export type GroupMemberRef = {
	id: string;
	displayName: string;
};

export type ExpensePaidByRef = {
	id: string;
	displayName: string;
};

export type ExpenseListItem = {
	id: string;
	groupId: string;
	title: string;
	amount: number;
	currency: string;
	paidBy: ExpensePaidByRef;
	participantsCount: number;
	category: string | null;
	expenseDate: Date;
	createdAt: Date;
};

export type ExpenseListPage = {
	expenses: ExpenseListItem[];
	nextCursor: string | null;
};

export type ExpenseDetailParticipant = {
	memberId: string;
	displayName: string;
	owedAmount: number;
	paidAmount: number;
	netAmount: number;
};

export type ExpenseDetail = {
	id: string;
	groupId: string;
	title: string;
	amount: number;
	currency: string;
	paidBy: ExpensePaidByRef;
	participants: ExpenseDetailParticipant[];
	splitType: string;
	category: string | null;
	notes: string | null;
	expenseDate: Date;
	createdAt: Date;
	updatedAt: Date;
};

export abstract class ExpenseRepository {
	abstract findActiveGroupMembers(
		groupId: string,
	): Promise<GroupMemberRef[] | null>;

	abstract create(expense: ExpenseEntity): Promise<ExpenseEntity>;

	abstract listByGroupForUser(input: {
		groupId: string;
		userId: string;
		limit: number;
		cursor?: string;
	}): Promise<ExpenseListPage | null>;

	abstract findDetailByIdForUser(input: {
		expenseId: string;
		userId: string;
	}): Promise<ExpenseDetail | null>;
}
