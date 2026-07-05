import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../../auth/domain/ports/auth-user.repository";
import { TokenDigestService } from "../../../auth/domain/ports/token-digest.service";
import { GroupInvitationRepository } from "../../domain/ports/group-invitation.repository";
import { AcceptGroupInvitationUseCase } from "./accept-group-invitation.use-case";

describe("AcceptGroupInvitationUseCase", () => {
	let useCase: AcceptGroupInvitationUseCase;
	let invitations: {
		findByDigest: ReturnType<typeof vi.fn>;
		accept: ReturnType<typeof vi.fn>;
	};
	let users: {
		findById: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		invitations = {
			findByDigest: vi.fn(),
			accept: vi.fn().mockResolvedValue(true),
		};
		users = {
			findById: vi.fn(),
		};
		tokenDigest = {
			digest: vi.fn().mockReturnValue("invite-digest"),
		};
		useCase = new AcceptGroupInvitationUseCase(
			invitations as never,
			users as never,
			tokenDigest as never,
		);
	});

	it("links a pending group member when token and verified email match", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue({
			id: "invite-1",
			groupMemberId: "member-1",
			email: "jane@example.com",
			tokenDigest: "invite-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
			groupMember: {
				id: "member-1",
				userId: null,
				groupId: "group-1",
			},
		});

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).resolves.toBeUndefined();

		expect(tokenDigest.digest).toHaveBeenCalledWith("raw-token");
		expect(invitations.accept).toHaveBeenCalledWith({
			invitationId: "invite-1",
			groupMemberId: "member-1",
			userId: "user-1",
			consumedAt: expect.any(Date),
		});
	});

	it("rejects invalid invitation tokens", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue(null);

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "GROUP_INVITATION_TOKEN_INVALID",
			statusCode: 400,
		});
		expect(invitations.accept).not.toHaveBeenCalled();
	});

	it("rejects already consumed invitation tokens", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue({
			id: "invite-1",
			groupMemberId: "member-1",
			email: "jane@example.com",
			tokenDigest: "invite-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: new Date(),
			groupMember: {
				id: "member-1",
				userId: null,
				groupId: "group-1",
			},
		});

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "GROUP_INVITATION_TOKEN_CONSUMED",
			statusCode: 409,
		});
		expect(invitations.accept).not.toHaveBeenCalled();
	});

	it("rejects tokens exactly at the expiry boundary", async () => {
		const now = new Date("2026-07-05T10:00:00.000Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue({
			id: "invite-1",
			groupMemberId: "member-1",
			email: "jane@example.com",
			tokenDigest: "invite-digest",
			expiresAt: now,
			consumedAt: null,
			groupMember: {
				id: "member-1",
				userId: null,
				groupId: "group-1",
			},
		});

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "GROUP_INVITATION_TOKEN_EXPIRED",
			statusCode: 410,
		});
		expect(invitations.accept).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it("rejects when atomic invitation acceptance reports a consumed token", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue({
			id: "invite-1",
			groupMemberId: "member-1",
			email: "jane@example.com",
			tokenDigest: "invite-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
			groupMember: {
				id: "member-1",
				userId: null,
				groupId: "group-1",
			},
		});
		invitations.accept.mockResolvedValue(false);

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "GROUP_INVITATION_TOKEN_CONSUMED",
			statusCode: 409,
		});
	});

	it("rejects unverified users before accepting invitations", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: null,
		});

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_NOT_VERIFIED",
			statusCode: 403,
		});
		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toBeInstanceOf(BusinessException);
		expect(invitations.accept).not.toHaveBeenCalled();
	});

	it("rejects invitations for a different email", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date(),
		});
		invitations.findByDigest.mockResolvedValue({
			id: "invite-1",
			groupMemberId: "member-1",
			email: "other@example.com",
			tokenDigest: "invite-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
			groupMember: {
				id: "member-1",
				userId: null,
				groupId: "group-1",
			},
		});

		await expect(useCase.execute({ userId: "user-1", token: "raw-token" })).rejects.toMatchObject({
			code: "GROUP_INVITATION_EMAIL_MISMATCH",
			statusCode: 403,
		});
		expect(invitations.accept).not.toHaveBeenCalled();
	});
});
