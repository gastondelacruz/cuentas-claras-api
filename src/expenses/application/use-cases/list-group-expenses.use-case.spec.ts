import { Test, type TestingModule } from "@nestjs/testing";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import { ListGroupExpensesUseCase } from "./list-group-expenses.use-case";

describe("ListGroupExpensesUseCase", () => {
	let useCase: ListGroupExpensesUseCase;
	let repository: {
		listByGroupForUser: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			listByGroupForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ListGroupExpensesUseCase,
				{
					provide: ExpenseRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(ListGroupExpensesUseCase);
	});

	it("delegates listing to the repository using the temporary dev user", async () => {
		const page = {
			expenses: [],
			nextCursor: null,
		};
		repository.listByGroupForUser.mockResolvedValue(page);

		await expect(
			useCase.execute({ groupId: "group-1", limit: 10, cursor: "expense-1" }),
		).resolves.toBe(page);

		expect(repository.listByGroupForUser).toHaveBeenCalledWith({
			groupId: "group-1",
			userId: "00000000-0000-0000-0000-000000000001",
			limit: 10,
			cursor: "expense-1",
		});
	});

	it("throws GROUP_NOT_FOUND when the group is not accessible", async () => {
		repository.listByGroupForUser.mockResolvedValue(null);

		await expect(
			useCase.execute({ groupId: "group-1", limit: 20 }),
		).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			statusCode: 404,
		});
	});
});
