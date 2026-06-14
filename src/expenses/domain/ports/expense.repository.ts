import type { ExpenseEntity } from "../entities/expense-entity";

export type GroupMemberRef = {
	id: string;
	displayName: string;
};

export abstract class ExpenseRepository {
	abstract findActiveGroupMembers(
		groupId: string,
	): Promise<GroupMemberRef[] | null>;

	abstract create(expense: ExpenseEntity): Promise<ExpenseEntity>;
}
