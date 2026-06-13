import type { CreateGroupPayload } from "../entities/create-group-payload";
import type { GroupDetail } from "../entities/group-detail";
import type { GroupListItem } from "../entities/group-list-item";
import type { GroupType } from "../entities/group-type";
import type { UpdateGroupPayload } from "../entities/update-group-payload";

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
		payload: CreateGroupPayload,
	): Promise<CreatedGroupSummary>;

	abstract listByUser(userId: string): Promise<GroupListItem[]>;

	abstract findDetailByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupDetail | null>;

	abstract updateByIdAndOwner(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupSummary | null>;

	abstract archiveByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<ArchivedGroup | null>;
}
