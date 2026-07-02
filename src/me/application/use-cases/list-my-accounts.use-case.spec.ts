import { Test, type TestingModule } from "@nestjs/testing";
import {
	AccountsRepository,
	type Account,
} from "../../domain/ports/accounts.repository";
import { ListMyAccountsUseCase } from "./list-my-accounts.use-case";

describe("ListMyAccountsUseCase", () => {
	let useCase: ListMyAccountsUseCase;
	let repository: {
		findByUserId: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			findByUserId: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ListMyAccountsUseCase,
				{
					provide: AccountsRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(ListMyAccountsUseCase);
	});

	it("returns the accounts for the authenticated user", async () => {
		const accounts: Account[] = [
			{
				id: "account-1",
				userId: "user-1",
				name: "Cash",
				kind: "cash",
				currency: "ARS",
				isDefault: false,
				archivedAt: null,
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
		];

		repository.findByUserId.mockResolvedValue(accounts);

		await expect(useCase.execute("user-1")).resolves.toEqual(accounts);
		expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
	});

	it("relies on the repository to exclude archived accounts", async () => {
		repository.findByUserId.mockResolvedValue([]);

		await expect(useCase.execute("user-1")).resolves.toEqual([]);
		expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
	});
});
