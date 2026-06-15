import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupLedger } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GetGroupBalancesUseCase } from "./get-group-balances.use-case";

describe("GetGroupBalancesUseCase", () => {
	let useCase: GetGroupBalancesUseCase;
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
				GetGroupBalancesUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(GetGroupBalancesUseCase);
	});

	it("returns the calculated balances for the dev user group", async () => {
		repository.findGroupLedgerForUser.mockResolvedValue(ledger);

		await expect(useCase.execute("group-1")).resolves.toEqual([
			{ memberId: "m1", displayName: "Gaston", balance: 15000, currency: "ARS" },
			{ memberId: "m2", displayName: "Ana", balance: -15000, currency: "ARS" },
		]);
		expect(repository.findGroupLedgerForUser).toHaveBeenCalledWith({
			groupId: "group-1",
			userId: "00000000-0000-0000-0000-000000000001",
		});
	});

	it("throws BusinessException when the group is missing or not accessible", async () => {
		repository.findGroupLedgerForUser.mockResolvedValue(null);

		await expect(useCase.execute("missing-group")).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			message: "Group not found.",
			statusCode: 404,
			type: "business",
		});
		await expect(useCase.execute("missing-group")).rejects.toBeInstanceOf(
			BusinessException,
		);
	});
});
