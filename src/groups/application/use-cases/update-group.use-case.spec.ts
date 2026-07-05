import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { GroupMemberUserResolver } from "../../domain/ports/group-member-user-resolver";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { UpdateGroupUseCase } from "./update-group.use-case";

describe("UpdateGroupUseCase", () => {
  let useCase: UpdateGroupUseCase;
	let repository: {
		updateByIdAndOwner: ReturnType<typeof vi.fn>;
	};
	let memberUserResolver: {
		resolveByEmails: ReturnType<typeof vi.fn>;
	};

  beforeEach(async () => {
		repository = {
			updateByIdAndOwner: vi.fn(),
		};
		memberUserResolver = {
			resolveByEmails: vi.fn().mockResolvedValue(new Map()),
		};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateGroupUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
				{
					provide: GroupMemberUserResolver,
					useValue: memberUserResolver,
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
	});

	it("links members to existing users by normalized email before persistence", async () => {
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

		memberUserResolver.resolveByEmails.mockResolvedValue(
			new Map([["ana.linked@example.com", "linked-user-1"]]),
		);
		repository.updateByIdAndOwner.mockResolvedValue(updatedGroup);

		await expect(useCase.execute("user-1", "group-1", payload)).resolves.toEqual(
			updatedGroup,
		);

		expect(memberUserResolver.resolveByEmails).toHaveBeenCalledWith([
			"ana.linked@example.com",
		]);
		expect(repository.updateByIdAndOwner).toHaveBeenCalledWith(
			"group-1",
			"user-1",
			expect.objectContaining({
				members: [
					expect.objectContaining({
						displayName: "Ana",
						email: expect.objectContaining({ value: "ana.linked@example.com" }),
						userId: "linked-user-1",
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
