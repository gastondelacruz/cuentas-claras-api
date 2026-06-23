import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { CreateGroupUseCase } from "./create-group.use-case";

describe("CreateGroupUseCase", () => {
  let useCase: CreateGroupUseCase;
  let repository: {
    createForUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      createForUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGroupUseCase,
        {
          provide: GroupRepository,
          useValue: repository,
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
			payload,
		);
	});
});
