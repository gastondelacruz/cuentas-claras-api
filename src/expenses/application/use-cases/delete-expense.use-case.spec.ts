import { Test, type TestingModule } from "@nestjs/testing";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import { DeleteExpenseUseCase } from "./delete-expense.use-case";

describe("DeleteExpenseUseCase", () => {
	let useCase: DeleteExpenseUseCase;
	let repository: {
		softDeleteForUser: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			softDeleteForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeleteExpenseUseCase,
				{
					provide: ExpenseRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(DeleteExpenseUseCase);
	});

	it("returns the soft-deleted expense reference", async () => {
		const deletedAt = new Date("2026-06-14T20:00:00.000Z");
		repository.softDeleteForUser.mockResolvedValue({
			id: "expense-1",
			deletedAt,
		});

		await expect(useCase.execute("user-1", "expense-1")).resolves.toEqual({
			id: "expense-1",
			deletedAt,
		});
		expect(repository.softDeleteForUser).toHaveBeenCalledWith({
			expenseId: "expense-1",
			userId: "user-1",
		});
	});

	it("throws EXPENSE_NOT_FOUND when the expense is not visible to the user", async () => {
		repository.softDeleteForUser.mockResolvedValue(null);

		await expect(useCase.execute("user-1", "expense-1")).rejects.toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			statusCode: 404,
		});
	});
});
