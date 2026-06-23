import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupLedger } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GetGroupSettlementsUseCase } from "./get-group-settlements.use-case";

describe("GetGroupSettlementsUseCase", () => {
	let useCase: GetGroupSettlementsUseCase;
	let repository: {
		findGroupLedgerForUser: ReturnType<typeof vi.fn>;
	};

	const ledger: GroupLedger = {
		members: [
			{ memberId: "m1", displayName: "Gaston" },
			{ memberId: "m2", displayName: "Ana" },
		],
		splits: [
			{ memberId: "m1", netAmount: 15000, currency: "ARS" },
			{ memberId: "m2", netAmount: -15000, currency: "ARS" },
		],
		settlements: [],
	};

	beforeEach(async () => {
		repository = {
			findGroupLedgerForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetGroupSettlementsUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(GetGroupSettlementsUseCase);
	});

	it("returns settlement suggestions for the authenticated user group", async () => {
		repository.findGroupLedgerForUser.mockResolvedValue(ledger);

		const result = await useCase.execute("user-1", "group-1");

		expect(result).toEqual([
			{
				fromMemberId: "m2",
				fromMemberName: "Ana",
				toMemberId: "m1",
				toMemberName: "Gaston",
				amount: 15000,
				currency: "ARS",
			},
		]);
		expect(repository.findGroupLedgerForUser).toHaveBeenCalledWith({
			groupId: "group-1",
			userId: "user-1",
		});
	});

	it("returns an empty array when all balances are already settled", async () => {
		const settledLedger: GroupLedger = {
			members: [
				{ memberId: "m1", displayName: "Gaston" },
				{ memberId: "m2", displayName: "Ana" },
			],
			splits: [
				{ memberId: "m1", netAmount: 15000, currency: "ARS" },
				{ memberId: "m2", netAmount: -15000, currency: "ARS" },
			],
			settlements: [
				{
					fromMemberId: "m2",
					toMemberId: "m1",
					amount: 15000,
					currency: "ARS",
				},
			],
		};

		repository.findGroupLedgerForUser.mockResolvedValue(settledLedger);

		const result = await useCase.execute("user-1", "group-1");

		expect(result).toEqual([]);
	});

	it("throws BusinessException when the group is missing or not accessible", async () => {
		repository.findGroupLedgerForUser.mockResolvedValue(null);

		await expect(useCase.execute("user-1", "missing-group")).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			message: "Group not found.",
			statusCode: 404,
			type: "business",
		});
		await expect(useCase.execute("user-1", "missing-group")).rejects.toBeInstanceOf(
			BusinessException,
		);
	});
});
