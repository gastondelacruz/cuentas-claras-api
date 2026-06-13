import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import { ArchiveGroupUseCase } from "./archive-group.use-case";

describe("ArchiveGroupUseCase", () => {
	let useCase: ArchiveGroupUseCase;
	let repository: {
		archiveByIdAndOwner: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			archiveByIdAndOwner: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ArchiveGroupUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(ArchiveGroupUseCase);
	});

	it("archives a group with a soft delete", async () => {
		const archivedGroup = {
			id: "group-1",
			archivedAt: new Date("2026-06-12T10:00:00.000Z"),
		};

		repository.archiveByIdAndOwner.mockResolvedValue(archivedGroup);

		await expect(useCase.execute("group-1")).resolves.toEqual(archivedGroup);
		expect(repository.archiveByIdAndOwner).toHaveBeenCalledWith(
			"group-1",
			"00000000-0000-0000-0000-000000000001",
		);
	});

	it("throws NotFoundException when the group is missing or not owned", async () => {
		repository.archiveByIdAndOwner.mockResolvedValue(null);

		await expect(useCase.execute("missing-group")).rejects.toThrow(
			NotFoundException,
		);
	});
});
