import { Test, type TestingModule } from "@nestjs/testing";
import {
	PersonalTransactionsRepository,
	type PersonalTransaction,
} from "../../domain/ports/personal-transactions.repository";
import { ListPersonalTransactionsUseCase } from "./list-personal-transactions.use-case";

describe("ListPersonalTransactionsUseCase", () => {
	let useCase: ListPersonalTransactionsUseCase;
	let repository: {
		findFiltered: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			findFiltered: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ListPersonalTransactionsUseCase,
				{
					provide: PersonalTransactionsRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(ListPersonalTransactionsUseCase);
	});

	it("lists transactions for the authenticated user with totals", async () => {
		const items: PersonalTransaction[] = [
			buildTransaction({ type: "expense", amount: 100 }),
			buildTransaction({ type: "income", amount: 200 }),
		];

		repository.findFiltered.mockResolvedValue({
			items,
			nextCursor: null,
		});

		const result = await useCase.execute({
			userId: "user-1",
			limit: 10,
		});

		expect(result.items).toEqual(items);
		expect(result.nextCursor).toBeNull();
		expect(result.totals).toEqual({
			incomeTotal: 200,
			expenseTotal: 100,
			total: 100,
			currency: "ARS",
		});
	});

	it("passes type and resolved date range filters to the repository", async () => {
		repository.findFiltered.mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		await useCase.execute({
			userId: "user-1",
			type: "expense",
			period: "day",
			limit: 5,
		});

		expect(repository.findFiltered).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "user-1",
				type: "expense",
				limit: 5,
			}),
		);

		const filters = repository.findFiltered.mock.calls[0][0];
		expect(filters.dateFrom).toBeInstanceOf(Date);
		expect(filters.dateTo).toBeInstanceOf(Date);
	});

	it("propagates the cursor returned by the repository", async () => {
		repository.findFiltered.mockResolvedValue({
			items: [buildTransaction({})],
			nextCursor: "cursor-1",
		});

		const result = await useCase.execute({
			userId: "user-1",
			limit: 10,
			cursor: "encoded-cursor",
		});

		expect(result.nextCursor).toBe("cursor-1");
		expect(repository.findFiltered).toHaveBeenCalledWith(
			expect.objectContaining({
				cursor: "encoded-cursor",
			}),
		);
	});

	it("passes category and expenseKind filters to the repository for expenses", async () => {
		repository.findFiltered.mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		await useCase.execute({
			userId: "user-1",
			type: "expense",
			category: "Food",
			expenseKind: "fixed",
			limit: 10,
		});

		expect(repository.findFiltered).toHaveBeenCalledWith(
			expect.objectContaining({
				category: "Food",
				expenseKind: "fixed",
			}),
		);
	});

	it("ignores expenseKind when listing income transactions", async () => {
		repository.findFiltered.mockResolvedValue({
			items: [],
			nextCursor: null,
		});

		await useCase.execute({
			userId: "user-1",
			type: "income",
			category: "Salary",
			expenseKind: "fixed",
			limit: 10,
		});

		expect(repository.findFiltered).toHaveBeenCalledWith(
			expect.not.objectContaining({
				expenseKind: "fixed",
			}),
		);
		expect(repository.findFiltered).toHaveBeenCalledWith(
			expect.objectContaining({
				category: "Salary",
			}),
		);
	});

	it("only totals transactions returned in the filtered set", async () => {
		repository.findFiltered.mockResolvedValue({
			items: [
				buildTransaction({ type: "expense", amount: 50 }),
				buildTransaction({ type: "expense", amount: 25 }),
			],
			nextCursor: null,
		});

		const result = await useCase.execute({
			userId: "user-1",
			type: "expense",
			limit: 10,
		});

		expect(result.totals).toEqual({
			incomeTotal: 0,
			expenseTotal: 75,
			total: -75,
			currency: "ARS",
		});
	});

	function buildTransaction(
		overrides: Partial<PersonalTransaction>,
	): PersonalTransaction {
		return {
			id: "tx-1",
			userId: "user-1",
			accountId: "account-1",
			accountName: "Cash",
			type: "expense",
			expenseKind: "variable",
			amount: 10,
			currency: "ARS",
			category: "Alimentación",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			note: null,
			createdAt: new Date("2026-06-29T10:00:00.000Z"),
			updatedAt: new Date("2026-06-29T10:00:00.000Z"),
			...overrides,
		};
	}
});
