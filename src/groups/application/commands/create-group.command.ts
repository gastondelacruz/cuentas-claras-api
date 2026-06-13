import type { GroupType } from "../../domain/value-objects/group-type.vo";

export type CreateGroupMemberCommand = {
	displayName: string;
	email?: string;
};

export type CreateGroupCommand = {
	name: string;
	description?: string | null;
	type: GroupType;
	currency: string;
	members?: CreateGroupMemberCommand[];
};
