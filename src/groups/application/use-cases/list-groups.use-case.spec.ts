import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { ListGroupsUseCase } from "./list-groups.use-case";

describe("ListGroupsUseCase", () => {
  let useCase: ListGroupsUseCase;
  let repository: {
    listByUser: ReturnType<typeof vi.fn>;
  };

  const now = new Date("2026-06-12T10:00:00.000Z");
  const later = new Date("2026-06-13T10:00:00.000Z");

	const groups: GroupEntity[] = [
		new GroupEntity({
			id: "group-1",
			name: "Trip to Bariloche",
			description: "Shared expenses for the trip",
			type: "trip",
			currency: "ARS",
			createdAt: now,
			updatedAt: now,
		}),
		new GroupEntity({
			id: "group-2",
			name: "Apartment",
			description: null,
			type: "home",
			currency: "USD",
			createdAt: later,
			updatedAt: later,
		}),
	];

  beforeEach(async () => {
    repository = {
      listByUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListGroupsUseCase,
        {
          provide: GroupRepository,
          useValue: repository,
        },
      ],
    }).compile();

    useCase = module.get(ListGroupsUseCase);
  });

  it("returns the list of groups for the dev user", async () => {
    repository.listByUser.mockResolvedValue(groups);

    await expect(useCase.execute()).resolves.toEqual(groups);
    expect(repository.listByUser).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("returns an empty array when the dev user has no groups", async () => {
    repository.listByUser.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
