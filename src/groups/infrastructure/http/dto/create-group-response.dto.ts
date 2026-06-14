import { GROUP_TYPES } from "../../../domain/value-objects/group-type.vo";

export class CreateGroupMemberDto {
	id?: string;
  displayName!: string;
  email?: string;
	isCurrentUser?: boolean;
	removedAt?: Date | string | null;
}

export class CreateGroupResponseDto {
  id!: string;
  name?: string;
  description?: string | null;
  type?: (typeof GROUP_TYPES)[number];
  currency?: string;
  members?: CreateGroupMemberDto[];
	membersCount?: number;
	expensesCount?: number;
	totalAmount?: number;
	currentUserBalance?: number;
	expenses?: unknown[];
	balances?: unknown[];
	createdAt?: Date | string;
	updatedAt?: Date | string;
	archivedAt?: Date | string | null;
}
