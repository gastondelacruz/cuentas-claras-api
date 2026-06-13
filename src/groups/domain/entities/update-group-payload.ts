import type { CreateGroupMemberPayload } from "./create-group-payload";
import type { GroupType } from "./group-type";

export type UpdateGroupPayload = {
	name?: string;
	description?: string | null;
	type?: GroupType;
	currency?: string;
	members?: CreateGroupMemberPayload[];
};
