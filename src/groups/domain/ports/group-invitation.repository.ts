export type GroupInvitationTokenRecord = {
	id: string;
	groupMemberId: string;
	email: string;
	tokenDigest: string;
	expiresAt: Date;
	consumedAt: Date | null;
	groupMember: {
		id: string;
		userId: string | null;
		groupId: string;
	};
};

export type SaveGroupInvitationTokenInput = {
	groupMemberId: string;
	email: string;
	tokenDigest: string;
	expiresAt: Date;
};

export abstract class GroupInvitationRepository {
	abstract save(input: SaveGroupInvitationTokenInput): Promise<void>;
	abstract invalidateActiveForMember(groupMemberId: string, invalidatedAt: Date): Promise<void>;
	abstract findByDigest(tokenDigest: string): Promise<GroupInvitationTokenRecord | null>;
	abstract accept(input: {
		invitationId: string;
		groupMemberId: string;
		userId: string;
		consumedAt: Date;
	}): Promise<boolean>;
}
