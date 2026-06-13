import type { GroupType } from "../value-objects/group-type.vo";

// ---------------------------------------------------------------------------
// Read-model projections — part of the port contract; consumed by the
// application layer via re-exports in application/read-models/.
// ---------------------------------------------------------------------------

export type GroupMemberReadModel = {
	id: string;
	displayName: string;
	email: string | null;
	isCurrentUser: boolean;
	removedAt: Date | null;
};

export type GroupExpenseReadModel = {
	id: string;
	title: string;
	amount: string;
	currency: string;
	paidByMemberId: string;
	splitType: string;
	category: string | null;
	notes: string | null;
	expenseDate: Date;
	createdAt: Date;
	updatedAt: Date;
};

export type GroupBalanceReadModel = {
	memberId: string;
	amount: string;
	currency: string;
};

export type GroupDetailReadModel = {
	id: string;
	name: string;
	description: string | null;
	currency: string;
	members: GroupMemberReadModel[];
	expenses: GroupExpenseReadModel[];
	balances: GroupBalanceReadModel[];
	createdAt: Date;
	updatedAt: Date;
};

export type GroupListItemReadModel = {
	id: string;
	name: string;
	description: string | null;
	currency: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CreateGroupMemberInput = {
	displayName: string;
	email?: string;
};

export type CreateGroupInput = {
	name: string;
	description?: string | null;
	type: GroupType;
	currency: string;
	members?: CreateGroupMemberInput[];
};

export type UpdateGroupInput = {
	name?: string;
	description?: string | null;
	type?: GroupType;
	currency?: string;
	members?: CreateGroupMemberInput[];
};

export type CreatedGroupSummary = {
	id: string;
	name: string;
	description: string | null;
	type: GroupType;
	currency: string;
	membersCount: number;
	expensesCount: number;
	totalAmount: number;
	currentUserBalance: number;
	createdAt: Date;
	updatedAt: Date;
};

export type GroupSummary = {
	id: string;
	name: string;
	description: string | null;
	type: GroupType;
	currency: string;
	membersCount: number;
	expensesCount: number;
	totalAmount: number;
	currentUserBalance: number;
	updatedAt: Date;
};

export type ArchivedGroup = {
	id: string;
	archivedAt: Date;
};

export abstract class GroupRepository {
	abstract createForUser(
		userId: string,
		payload: CreateGroupInput,
	): Promise<CreatedGroupSummary>;

	abstract listByUser(userId: string): Promise<GroupListItemReadModel[]>;

	abstract findDetailByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupDetailReadModel | null>;

	abstract updateByIdAndOwner(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupInput,
	): Promise<GroupSummary | null>;

	abstract archiveByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<ArchivedGroup | null>;
}
