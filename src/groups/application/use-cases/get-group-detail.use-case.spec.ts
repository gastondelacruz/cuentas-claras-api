import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { GroupRepository } from "../../domain/ports/group.repository";
import {
	type GroupBalance,
	type GroupDetail,
	type GroupExpense,
	type GroupMember,
} from "../../domain/entities/group-detail";
import { GetGroupDetailUseCase } from "./get-group-detail.use-case";

describe("GetGroupDetailUseCase", () => {
	let useCase: GetGroupDetailUseCase;
	let repository: {
		findDetailByIdAndOwner: ReturnType<typeof vi.fn>;
	};

	const members: GroupMember[] = [
		{
			id: "member-1",
			displayName: "Development User",
			email: "dev@cuentasclaras.local",
			isCurrentUser: true,
			removedAt: null,
		},
	];
	const expenses: GroupExpense[] = [];
	const balances: GroupBalance[] = [];
	const groupDetail: GroupDetail = {
		id: "group-1",
		name: "Trip to Bariloche",
		description: "Shared expenses for the trip",
		currency: "ARS",
		members,
		expenses,
		balances,
		createdAt: new Date("2026-06-12T10:00:00.000Z"),
		updatedAt: new Date("2026-06-12T10:00:00.000Z"),
	};

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
