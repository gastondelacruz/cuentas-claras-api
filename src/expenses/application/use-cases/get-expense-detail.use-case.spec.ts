import { Test, type TestingModule } from "@nestjs/testing";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import { GetExpenseDetailUseCase } from "./get-expense-detail.use-case";

describe("GetExpenseDetailUseCase", () => {
	let useCase: GetExpenseDetailUseCase;
	let repository: {
		findDetailByIdForUser: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			findDetailByIdForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetExpenseDetailUseCase,
				{
					provide: ExpenseRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(GetExpenseDetailUseCase);
	});

	it("delegates detail lookup to the repository using the temporary dev user", async () => {
		const detail = {
			id: "expense-1",
			groupId: "group-1",
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidBy: { id: "member-a", displayName: "Gaston" },
			participants: [],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			createdAt: new Date("2026-06-13T21:00:00.000Z"),
			updatedAt: new Date("2026-06-13T21:30:00.000Z"),
		};
		repository.findDetailByIdForUser.mockResolvedValue(detail);

		await expect(useCase.execute("expense-1")).resolves.toBe(detail);
		expect(repository.findDetailByIdForUser).toHaveBeenCalledWith({
			expenseId: "expense-1",
			userId: "00000000-0000-0000-0000-000000000001",
		});
	});

	it("throws EXPENSE_NOT_FOUND when the expense is missing or inaccessible", async () => {
		repository.findDetailByIdForUser.mockResolvedValue(null);

		await expect(useCase.execute("expense-1")).rejects.toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			statusCode: 404,
		});
	});
});
