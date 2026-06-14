import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { UpdateGroupUseCase } from "./update-group.use-case";

describe("UpdateGroupUseCase", () => {
  let useCase: UpdateGroupUseCase;
  let repository: {
    updateByIdAndOwner: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      updateByIdAndOwner: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateGroupUseCase,
        {
          provide: GroupRepository,
          useValue: repository,
        },
      ],
    }).compile();

    useCase = module.get(UpdateGroupUseCase);
  });

  it("updates a group for the dev user", async () => {
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

    await expect(useCase.execute("group-1", payload)).resolves.toEqual(
      updatedGroup,
    );
    expect(repository.updateByIdAndOwner).toHaveBeenCalledWith(
      "group-1",
      "00000000-0000-0000-0000-000000000001",
      payload,
    );
  });

  it("throws NotFoundException when the group is missing or not owned", async () => {
    repository.updateByIdAndOwner.mockResolvedValue(null);

    await expect(
      useCase.execute("missing-group", { name: "Updated name" }),
    ).rejects.toThrow(NotFoundException);
  });
});
