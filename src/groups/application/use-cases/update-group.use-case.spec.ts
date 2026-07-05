import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { SendGroupInvitationsService } from "../services/send-group-invitations.service";
import { UpdateGroupUseCase } from "./update-group.use-case";

describe("UpdateGroupUseCase", () => {
  let useCase: UpdateGroupUseCase;
	let repository: {
		updateByIdAndOwner: ReturnType<typeof vi.fn>;
	};
	let groupInvitations: {
		sendForPendingMembers: ReturnType<typeof vi.fn>;
	};

  beforeEach(async () => {
		repository = {
			updateByIdAndOwner: vi.fn(),
		};
		groupInvitations = {
			sendForPendingMembers: vi.fn().mockResolvedValue(undefined),
		};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateGroupUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
				{
					provide: SendGroupInvitationsService,
					useValue: groupInvitations,
				},
			],
		}).compile();

    useCase = module.get(UpdateGroupUseCase);
  });

	it("updates a group for the authenticated user", async () => {
		const payload: UpdateGroupPayload = {
			name: "Updated name",
			description: "Updated description",
			type: "trip",
			currency: "ARS",
			members: [
				new GroupMemberEntity({
					id: "member-1",
					displayName: "Ana",
					email: "ana@example.com",
				}),
			],
		};
		const updatedGroup = new GroupEntity({
			id: "group-1",
			name: "Updated name",
			description: "Updated description",
			type: "trip",
			currency: "ARS",
			members: payload.members,
			updatedAt: new Date("2026-06-12T10:00:00.000Z"),
		});

    repository.updateByIdAndOwner.mockResolvedValue(updatedGroup);

		await expect(useCase.execute("user-1", "group-1", payload)).resolves.toEqual(
			updatedGroup,
		);
		expect(repository.updateByIdAndOwner).toHaveBeenCalledWith(
			"group-1",
			"user-1",
			expect.objectContaining({
				name: payload.name,
				description: payload.description,
				type: payload.type,
				currency: payload.currency,
				members: [
					expect.objectContaining({
						displayName: "Ana",
						userId: null,
					}),
				],
			}),
		);
		expect(groupInvitations.sendForPendingMembers).toHaveBeenCalledWith(updatedGroup);
	});

	it("keeps updated email members pending until invitation acceptance", async () => {
		const payload: UpdateGroupPayload = {
			members: [
				new GroupMemberEntity({
					id: "member-1",
					displayName: "Ana",
					email: " Ana.Linked@Example.COM ",
				}),
			],
		};
		const updatedGroup = new GroupEntity({
			id: "group-1",
			name: "Updated name",
			type: "friends",
			currency: "ARS",
			members: payload.members,
		});

		repository.updateByIdAndOwner.mockResolvedValue(updatedGroup);

		await expect(useCase.execute("user-1", "group-1", payload)).resolves.toEqual(
			updatedGroup,
		);

		expect(repository.updateByIdAndOwner).toHaveBeenCalledWith(
			"group-1",
			"user-1",
			expect.objectContaining({
				members: [
						expect.objectContaining({
							displayName: "Ana",
							email: expect.objectContaining({ value: "ana.linked@example.com" }),
							userId: null,
						}),
					],
			}),
		);
	});

	it("throws BusinessException when the group is missing or not owned", async () => {
		repository.updateByIdAndOwner.mockResolvedValue(null);

		await expect(
			useCase.execute("user-1", "missing-group", { name: "Updated name" }),
		).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			message: "Group not found.",
			statusCode: 404,
			type: "business",
		});
		await expect(
			useCase.execute("user-1", "missing-group", { name: "Updated name" }),
		).rejects.toBeInstanceOf(BusinessException);
	});
});
