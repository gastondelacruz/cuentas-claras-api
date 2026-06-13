import type { GroupType } from "./group-type";

export type CreateGroupMemberPayload = {
	displayName: string;
	email?: string;
};

export type CreateGroupPayload = {
	name: string;
	description?: string | null;
	type: GroupType;
	currency: string;
	members?: CreateGroupMemberPayload[];
};
