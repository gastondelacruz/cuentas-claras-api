import { GroupEntity } from "../entities/group-entity";
import { GroupMemberEntity } from "../entities/group-member-entity";
import { Currency } from "../value-objects/currency.vo";
import { GroupName } from "../value-objects/group-name.vo";
import type { GroupType } from "../value-objects/group-type.vo";

export type UpdateGroupPayload = {
	name?: GroupName | string;
	description?: string | null;
	type?: GroupType;
	currency?: Currency | string;
	members?: GroupMemberEntity[];
};

export abstract class GroupRepository {
	abstract createForUser(userId: string, payload: GroupEntity): Promise<GroupEntity>;

	abstract listByUser(userId: string): Promise<GroupEntity[]>;

	abstract findDetailByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupEntity | null>;

	abstract updateByIdAndOwner(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupEntity | null>;

	abstract archiveByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupEntity | null>;
}
