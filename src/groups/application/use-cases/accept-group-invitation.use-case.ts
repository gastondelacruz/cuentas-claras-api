import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../../auth/domain/ports/auth-user.repository";
import { TokenDigestService } from "../../../auth/domain/ports/token-digest.service";
import { GroupInvitationRepository } from "../../domain/ports/group-invitation.repository";

export type AcceptGroupInvitationInput = {
	userId: string;
	token: string;
};

@Injectable()
export class AcceptGroupInvitationUseCase {
	constructor(
		private readonly invitations: GroupInvitationRepository,
		private readonly users: AuthUserRepository,
		private readonly tokenDigest: TokenDigestService,
	) {}

	async execute(input: AcceptGroupInvitationInput): Promise<void> {
		const user = await this.users.findById(input.userId);

		if (!user?.emailVerifiedAt) {
			throw new BusinessException("EMAIL_NOT_VERIFIED", "Email verification is required for this action.", 403);
		}

		const invitation = await this.invitations.findByDigest(this.tokenDigest.digest(input.token));

		if (!invitation) {
			throw new BusinessException("GROUP_INVITATION_TOKEN_INVALID", "Invalid group invitation token.", 400);
		}

		if (invitation.consumedAt !== null || invitation.groupMember.userId !== null) {
			throw new BusinessException("GROUP_INVITATION_TOKEN_CONSUMED", "Group invitation token was already used.", 409);
		}

		if (invitation.expiresAt.getTime() <= Date.now()) {
			throw new BusinessException("GROUP_INVITATION_TOKEN_EXPIRED", "Group invitation token expired.", 410);
		}

		if (invitation.email !== user.email.toLowerCase()) {
			throw new BusinessException("GROUP_INVITATION_EMAIL_MISMATCH", "Invitation email does not match the current user.", 403);
		}

		const accepted = await this.invitations.accept({
			invitationId: invitation.id,
			groupMemberId: invitation.groupMemberId,
			userId: user.id,
			consumedAt: new Date(),
		});

		if (!accepted) {
			throw new BusinessException("GROUP_INVITATION_TOKEN_CONSUMED", "Group invitation token was already used.", 409);
		}
	}
}
