import { Test, type TestingModule } from "@nestjs/testing";
import {
	PersonalTransactionsRepository,
	type PersonalTransactionsSummary,
} from "../../domain/ports/personal-transactions.repository";
import { GetPersonalTransactionsSummaryUseCase } from "./get-personal-transactions-summary.use-case";

describe("GetPersonalTransactionsSummaryUseCase", () => {
	let useCase: GetPersonalTransactionsSummaryUseCase;
	let repository: {
		getSummary: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			getSummary: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetPersonalTransactionsSummaryUseCase,
				{
					provide: PersonalTransactionsRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(GetPersonalTransactionsSummaryUseCase);
	});

	it("gets global income and expense totals with category percentages", async () => {
		const summary: PersonalTransactionsSummary = {
			incomeTotal: 1000,
			expenseTotal: 250,
			breakdown: [
				{
					category: "Salary",
					type: "income",
					amount: 1000,
				},
				{
					category: "Food",
					type: "expense",
					amount: 200,
				},
				{
					category: "Transport",
					type: "expense",
					amount: 50,
				},
			],
		};
		repository.getSummary.mockResolvedValue(summary);

		const result = await useCase.execute({
			userId: "user-1",
			period: "month",
		});

		expect(result).toEqual({
			total: 750,
			incomeTotal: 1000,
			expenseTotal: 250,
			currency: "ARS",
			breakdown: [
				{
					category: "Salary",
					type: "income",
					amount: 1000,
					percentage: 100,
				},
				{
					category: "Food",
					type: "expense",
					amount: 200,
					percentage: 80,
				},
				{
					category: "Transport",
					type: "expense",
					amount: 50,
					percentage: 20,
				},
			],
		});
	});

	it("defaults to the week period and passes the resolved range to the repository", async () => {
		repository.getSummary.mockResolvedValue({
			incomeTotal: 0,
			expenseTotal: 0,
			breakdown: [],
		});

		await useCase.execute({ userId: "user-1" });

		expect(repository.getSummary).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "user-1",
			}),
		);

		const filters = repository.getSummary.mock.calls[0][0];
		expect(filters.dateFrom).toBeInstanceOf(Date);
		expect(filters.dateTo).toBeInstanceOf(Date);
	});

	it("uses explicit date range without passing the period sentinel", async () => {
		repository.getSummary.mockResolvedValue({
			incomeTotal: 0,
			expenseTotal: 0,
			breakdown: [],
		});
		const dateFrom = new Date("2026-06-01T00:00:00.000Z");
		const dateTo = new Date("2026-06-30T00:00:00.000Z");

		await useCase.execute({
			userId: "user-1",
			dateFrom,
			dateTo,
		});

		expect(repository.getSummary).toHaveBeenCalledWith({
			userId: "user-1",
			dateFrom,
			dateTo,
		});
	});

	it("returns zero percentages when a group total is zero", async () => {
		repository.getSummary.mockResolvedValue({
			incomeTotal: 0,
			expenseTotal: 0,
			breakdown: [
				{
					category: "Food",
					type: "expense",
					amount: 0,
				},
			],
		});

		const result = await useCase.execute({ userId: "user-1" });

		expect(result.breakdown[0].percentage).toBe(0);
	});
});
