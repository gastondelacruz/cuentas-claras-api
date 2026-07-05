import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { TokenDigestService } from "../../../auth/domain/ports/token-digest.service";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { GroupInvitationRepository } from "../../domain/ports/group-invitation.repository";
import { SendGroupInvitationsService } from "./send-group-invitations.service";

describe("SendGroupInvitationsService", () => {
	let service: SendGroupInvitationsService;
	let invitations: {
		invalidateActiveForMember: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: {
		digest: ReturnType<typeof vi.fn>;
	};
	let mail: {
		sendGroupInvitationEmail: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		invitations = {
			invalidateActiveForMember: vi.fn().mockResolvedValue(undefined),
			save: vi.fn().mockResolvedValue(undefined),
		};
		tokenDigest = {
			digest: vi.fn().mockReturnValue("new-invitation-digest"),
		};
		mail = {
			sendGroupInvitationEmail: vi.fn().mockResolvedValue(undefined),
		};
		service = new SendGroupInvitationsService(
			invitations as unknown as GroupInvitationRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "http://localhost:3000",
				invitationTokenTtl: "7d",
			} as never,
		);
	});

	it("invalidates existing active invitation tokens before storing and sending a replacement", async () => {
		const group = new GroupEntity({
			id: "group-1",
			name: "Trip",
			type: "trip",
			currency: "ARS",
			members: [
				new GroupMemberEntity({
					id: "member-1",
					displayName: "Ana",
					email: "ana@example.com",
				}),
			],
		});

		await service.sendForPendingMembers(group);

		expect(invitations.invalidateActiveForMember).toHaveBeenCalledWith("member-1", expect.any(Date));
		expect(invitations.save).toHaveBeenCalledWith({
			groupMemberId: "member-1",
			email: "ana@example.com",
			tokenDigest: "new-invitation-digest",
			expiresAt: expect.any(Date),
		});
		expect(mail.sendGroupInvitationEmail).toHaveBeenCalledWith({
			to: "ana@example.com",
			inviteeName: "Ana",
			groupName: "Trip",
			invitationUrl: expect.stringContaining("http://localhost:3000/group-invitations/accept?token="),
		});
	});

	it("builds group invitation links with a custom mobile scheme", async () => {
		service = new SendGroupInvitationsService(
			invitations as unknown as GroupInvitationRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "cuentasclaras://",
				invitationTokenTtl: "7d",
			} as never,
		);
		const group = createGroupWithPendingMember();

		await service.sendForPendingMembers(group);

		const emailInput = mail.sendGroupInvitationEmail.mock.calls[0][0];
		expect(emailInput.invitationUrl).toMatch(/^cuentasclaras:\/\/group-invitations\/accept\?token=.+$/);
		expect(emailInput.invitationUrl).not.toContain("cuentasclaras:///");
	});

	it("builds group invitation links with an HTTPS base URL", async () => {
		service = new SendGroupInvitationsService(
			invitations as unknown as GroupInvitationRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "https://links.cuentasclaras.app/",
				invitationTokenTtl: "7d",
			} as never,
		);
		const group = createGroupWithPendingMember();

		await service.sendForPendingMembers(group);

		const emailInput = mail.sendGroupInvitationEmail.mock.calls[0][0];
		expect(emailInput.invitationUrl).toMatch(/^https:\/\/links\.cuentasclaras\.app\/group-invitations\/accept\?token=.+$/);
		expect(emailInput.invitationUrl).not.toContain("app//group-invitations");
	});

	it("keeps durable invitation token state when mail delivery fails", async () => {
		const group = createGroupWithPendingMember();
		mail.sendGroupInvitationEmail.mockRejectedValue(new Error("mail failed"));

		await expect(service.sendForPendingMembers(group)).resolves.toBeUndefined();

		expect(invitations.invalidateActiveForMember).toHaveBeenCalled();
		expect(invitations.save).toHaveBeenCalled();
	});
});

function createGroupWithPendingMember(): GroupEntity {
	return new GroupEntity({
		id: "group-1",
		name: "Trip",
		type: "trip",
		currency: "ARS",
		members: [
			new GroupMemberEntity({
				id: "member-1",
				displayName: "Ana",
				email: "ana@example.com",
			}),
		],
	});
}
