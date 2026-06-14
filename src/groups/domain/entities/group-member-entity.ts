import { Email } from "../value-objects/email.vo";

export type GroupMemberEntityProps = {
	id: string;
	displayName: string;
	email?: Email | string | null;
	userId?: string | null;
	removedAt?: Date | null;
};

export class GroupMemberEntity {
	readonly id: string;
	readonly displayName: string;
	readonly email: Email | null;
	readonly userId: string | null;
	readonly removedAt: Date | null;

	constructor(props: GroupMemberEntityProps) {
		this.id = props.id;
		this.displayName = props.displayName;
		this.email = GroupMemberEntity.normalizeEmail(props.email);
		this.userId = props.userId ?? null;
		this.removedAt = props.removedAt ?? null;
	}

	get isActive(): boolean {
		return this.removedAt === null;
	}

	isCurrentUser(userId: string): boolean {
		return this.userId === userId;
	}

	getEmailValue(): string | null {
		return this.email?.getValue() ?? null;
	}

	private static normalizeEmail(email: Email | string | null | undefined): Email | null {
		if (email === null || email === undefined) {
			return null;
		}

		if (email instanceof Email) {
			return email;
		}

		return new Email(email);
	}
}
