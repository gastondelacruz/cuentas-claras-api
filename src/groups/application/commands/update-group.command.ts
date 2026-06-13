import type { CreateGroupMemberCommand } from "./create-group.command";
import type { GroupType } from "../../domain/value-objects/group-type.vo";

export type UpdateGroupCommand = {
	name?: string;
	description?: string | null;
	type?: GroupType;
	currency?: string;
	members?: CreateGroupMemberCommand[];
};
