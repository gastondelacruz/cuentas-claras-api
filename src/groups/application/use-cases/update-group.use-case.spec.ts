import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import type { UpdateGroupCommand } from "../commands/update-group.command";
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
		const payload: UpdateGroupCommand = {
			name: "Updated name",
			description: "Updated description",
			type: "trip",
			currency: "ARS",
			members: [
				{
					displayName: "Ana",
					email: "ana@example.com",
				},
			],
		};
		const updatedGroup = {
			id: "group-1",
			name: payload.name,
			description: payload.description,
			type: payload.type,
			currency: payload.currency,
			membersCount: 2,
			expensesCount: 0,
			totalAmount: 0,
			currentUserBalance: 0,
			updatedAt: new Date("2026-06-12T10:00:00.000Z"),
		};

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
