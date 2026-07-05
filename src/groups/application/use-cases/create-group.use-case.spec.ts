import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { SendGroupInvitationsService } from "../services/send-group-invitations.service";
import { CreateGroupUseCase } from "./create-group.use-case";

describe("CreateGroupUseCase", () => {
  let useCase: CreateGroupUseCase;
	let repository: {
		createForUser: ReturnType<typeof vi.fn>;
	};
	let groupInvitations: {
		sendForPendingMembers: ReturnType<typeof vi.fn>;
	};

  beforeEach(async () => {
		repository = {
			createForUser: vi.fn(),
		};
		groupInvitations = {
			sendForPendingMembers: vi.fn().mockResolvedValue(undefined),
		};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGroupUseCase,
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

    useCase = module.get(CreateGroupUseCase);
  });

	it("delegates creation to the repository using the authenticated user id", async () => {
		const payload = new GroupEntity({
			id: "group-1",
			name: "Trip to Bariloche",
			description: "Shared expenses for the trip",
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
		const createdGroup = new GroupEntity({
			id: "group-1",
			name: "Trip to Bariloche",
			description: "Shared expenses for the trip",
			type: "trip",
			currency: "ARS",
			members: payload.members,
			createdAt: new Date("2026-06-13T10:00:00.000Z"),
			updatedAt: new Date("2026-06-13T10:00:00.000Z"),
		});

    repository.createForUser.mockResolvedValue(createdGroup);

		await expect(useCase.execute("user-1", payload)).resolves.toEqual(createdGroup);
		expect(repository.createForUser).toHaveBeenCalledWith(
			"user-1",
			expect.objectContaining({
				id: payload.id,
				members: [
					expect.objectContaining({
						displayName: "Ana",
						userId: null,
					}),
				],
			}),
		);
		expect(groupInvitations.sendForPendingMembers).toHaveBeenCalledWith(createdGroup);
	});

	it("keeps invited members pending even when their email belongs to an existing user", async () => {
		const payload = new GroupEntity({
			id: "group-1",
			name: "Trip to Mendoza",
			type: "trip",
			currency: "ARS",
			members: [
				new GroupMemberEntity({
					id: "member-1",
					displayName: "Ana",
					email: " Ana@Example.COM ",
				}),
				new GroupMemberEntity({
					id: "member-2",
					displayName: "Pending",
					email: "pending@example.com",
				}),
			],
		});
		const createdGroup = new GroupEntity({
			id: "group-1",
			name: "Trip to Mendoza",
			type: "trip",
			currency: "ARS",
		});

		repository.createForUser.mockResolvedValue(createdGroup);

		await expect(useCase.execute("owner-1", payload)).resolves.toEqual(createdGroup);

		const persistedPayload = repository.createForUser.mock.calls[0][1] as GroupEntity;
		expect(persistedPayload.members).toEqual([
			expect.objectContaining({
				displayName: "Ana",
				userId: null,
			}),
			expect.objectContaining({
				displayName: "Pending",
				userId: null,
			}),
		]);
	});
});
