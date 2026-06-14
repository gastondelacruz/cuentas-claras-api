import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { GetGroupDetailUseCase } from "./get-group-detail.use-case";

describe("GetGroupDetailUseCase", () => {
  let useCase: GetGroupDetailUseCase;
  let repository: {
    findDetailByIdAndOwner: ReturnType<typeof vi.fn>;
  };

	const members: GroupMemberEntity[] = [
		new GroupMemberEntity({
			id: "member-1",
			displayName: "Development User",
			email: "dev@cuentasclaras.local",
			userId: "00000000-0000-0000-0000-000000000001",
			removedAt: null,
		}),
	];
	const groupDetail = new GroupEntity({
		id: "group-1",
		name: "Trip to Bariloche",
		description: "Shared expenses for the trip",
		type: "trip",
		currency: "ARS",
		members,
		createdAt: new Date("2026-06-12T10:00:00.000Z"),
		updatedAt: new Date("2026-06-12T10:00:00.000Z"),
	});

  beforeEach(async () => {
    repository = {
      findDetailByIdAndOwner: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetGroupDetailUseCase,
        {
          provide: GroupRepository,
          useValue: repository,
        },
      ],
    }).compile();

    useCase = module.get(GetGroupDetailUseCase);
  });

  it("returns the group detail for the dev user", async () => {
    repository.findDetailByIdAndOwner.mockResolvedValue(groupDetail);

    await expect(useCase.execute("group-1")).resolves.toEqual(groupDetail);
    expect(repository.findDetailByIdAndOwner).toHaveBeenCalledWith(
      "group-1",
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("throws NotFoundException when the group is missing or not owned", async () => {
    repository.findDetailByIdAndOwner.mockResolvedValue(null);

    await expect(useCase.execute("missing-group")).rejects.toThrow(
      NotFoundException,
    );
  });
});
