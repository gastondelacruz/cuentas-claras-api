import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import mailConfig from "../../../config/mail.config";
import { buildAppActionLink } from "../../../shared/application/app-action-link";
import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { TokenDigestService } from "../../../auth/domain/ports/token-digest.service";
import { createRandomToken } from "../../../auth/application/services/random-token";
import { ttlToDate } from "../../../auth/application/services/ttl-to-date";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupInvitationRepository } from "../../domain/ports/group-invitation.repository";

@Injectable()
export class SendGroupInvitationsService {
	constructor(
		private readonly invitations: GroupInvitationRepository,
		private readonly tokenDigest: TokenDigestService,
		private readonly mail: MailDeliveryPort,
		@Inject(mailConfig.KEY)
		private readonly mailSettings: ConfigType<typeof mailConfig>,
	) {}

	async sendForPendingMembers(group: GroupEntity): Promise<void> {
		for (const member of group.members) {
			const email = member.getEmailValue();

			if (!email || member.userId) {
				continue;
			}

			const token = createRandomToken();
			await this.invitations.invalidateActiveForMember(member.id, new Date());
			await this.invitations.save({
				groupMemberId: member.id,
				email,
				tokenDigest: this.tokenDigest.digest(token),
				expiresAt: ttlToDate(this.mailSettings.invitationTokenTtl),
			});

			await this.mail.sendGroupInvitationEmail({
				to: email,
				inviteeName: member.displayName,
				groupName: group.name.getValue(),
				invitationUrl: buildAppActionLink(this.mailSettings.appPublicUrl, "group-invitations/accept", { token }),
			}).catch(() => undefined);
		}
	}
}
