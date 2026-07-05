import { Currency } from "../value-objects/currency.vo";
import { GroupName } from "../value-objects/group-name.vo";
import type { GroupType } from "../value-objects/group-type.vo";
import { GroupMemberEntity } from "./group-member-entity";

export type GroupEntityProps = {
	id: string;
	name: GroupName | string;
	description?: string | null;
	type: GroupType;
	currency: Currency | string;
	members?: GroupMemberEntity[];
	createdAt?: Date;
	updatedAt?: Date;
	archivedAt?: Date | null;
};

export class GroupEntity {
	readonly id: string;
	readonly name: GroupName;
	readonly description: string | null;
	readonly type: GroupType;
	readonly currency: Currency;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
	readonly archivedAt: Date | null;
	private readonly groupMembers: GroupMemberEntity[] = [];

	constructor(props: GroupEntityProps) {
		this.id = props.id;
		this.name = props.name instanceof GroupName ? props.name : new GroupName(props.name);
		this.description = props.description ?? null;
		this.type = props.type;
		this.currency = props.currency instanceof Currency ? props.currency : new Currency(props.currency);
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
		this.archivedAt = props.archivedAt ?? null;

		for (const member of props.members ?? []) {
			this.addMember(member);
		}
	}

	get members(): GroupMemberEntity[] {
		return [...this.groupMembers];
	}

	addMember(member: GroupMemberEntity): void {
		const memberEmail = member.getEmailValue();

		if (memberEmail && this.hasActiveMemberWithEmail(memberEmail)) {
			throw new Error("Group members cannot share the same email.");
		}

		if (member.userId && this.hasActiveMemberWithUserId(member.userId)) {
			throw new Error("Group members cannot share the same user.");
		}

		this.groupMembers.push(member);
	}

	replaceInvitedMembers(
		members: GroupMemberEntity[],
		currentUserId: string,
	): GroupEntity {
		const preservedMembers = this.groupMembers.filter((member) =>
			member.isCurrentUser(currentUserId),
		);

		return new GroupEntity({
			id: this.id,
			name: this.name,
			description: this.description,
			type: this.type,
			currency: this.currency,
			members: [...preservedMembers, ...members],
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			archivedAt: this.archivedAt,
		});
	}

	private hasActiveMemberWithEmail(email: string): boolean {
		return this.groupMembers.some(
			(member) => member.isActive && member.getEmailValue() === email,
		);
	}

	private hasActiveMemberWithUserId(userId: string): boolean {
		return this.groupMembers.some(
			(member) => member.isActive && member.userId === userId,
		);
	}
}
