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

export type GroupLedgerMember = {
	memberId: string;
	displayName: string;
};

export type GroupMemberRef = GroupLedgerMember;

export type GroupLedgerSplit = {
	memberId: string;
	netAmount: number;
	currency: string;
};

export type GroupLedgerSettlement = {
	fromMemberId: string;
	toMemberId: string;
	amount: number;
	currency: string;
};

export type GroupLedger = {
	members: GroupLedgerMember[];
	splits: GroupLedgerSplit[];
	settlements: GroupLedgerSettlement[];
};

export type SettlementPaymentRef = {
	id: string;
	groupId: string;
	fromMember: {
		id: string;
		displayName: string;
	};
	toMember: {
		id: string;
		displayName: string;
	};
	amount: number;
	currency: string;
	paidAt: Date;
	notes: string | null;
	createdAt: Date;
};

export type RecordSettlementPaymentPayload = {
	groupId: string;
	fromMemberId: string;
	toMemberId: string;
	amount: number;
	currency: string;
	paidAt: Date;
	notes: string | null;
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

	abstract findGroupLedgerForUser(input: {
		groupId: string;
		userId: string;
	}): Promise<GroupLedger | null>;

	abstract findActiveGroupMembersForUser(input: {
		groupId: string;
		userId: string;
	}): Promise<GroupMemberRef[] | null>;

	abstract recordSettlementPayment(
		payload: RecordSettlementPaymentPayload,
	): Promise<SettlementPaymentRef>;
}
