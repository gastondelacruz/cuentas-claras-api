import { Test, type TestingModule } from "@nestjs/testing";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import {
	type UpdateExpenseInput,
	UpdateExpenseUseCase,
} from "./update-expense.use-case";

describe("UpdateExpenseUseCase", () => {
	let useCase: UpdateExpenseUseCase;
	let repository: {
		findDetailByIdForUser: ReturnType<typeof vi.fn>;
		findActiveGroupMembers: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};

	const currentExpense = {
		id: "expense-1",
		groupId: "group-1",
		title: "Dinner",
		amount: 30000,
		currency: "ARS",
		paidBy: { id: "member-a", displayName: "Gaston" },
		participants: [
			{
				memberId: "member-a",
				displayName: "Gaston",
				owedAmount: 15000,
				paidAmount: 30000,
				netAmount: 15000,
			},
			{
				memberId: "member-b",
				displayName: "Ana",
				owedAmount: 15000,
				paidAmount: 0,
				netAmount: -15000,
			},
		],
		splitType: "equal",
		category: "food",
		notes: "Pizza night",
		expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		createdAt: new Date("2026-06-13T21:00:00.000Z"),
		updatedAt: new Date("2026-06-13T21:30:00.000Z"),
	};

	beforeEach(async () => {
		repository = {
			findDetailByIdForUser: vi.fn(),
			findActiveGroupMembers: vi.fn(),
			update: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UpdateExpenseUseCase,
				{
					provide: ExpenseRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(UpdateExpenseUseCase);
	});

	it("throws EXPENSE_NOT_FOUND when the expense is not visible to the user", async () => {
		repository.findDetailByIdForUser.mockResolvedValue(null);

		await expect(
			useCase.execute({ expenseId: "expense-1", title: "Updated" }),
		).rejects.toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			statusCode: 404,
		});
		expect(repository.update).not.toHaveBeenCalled();
	});

	it("validates changed payer and participants against active group members", async () => {
		repository.findDetailByIdForUser.mockResolvedValue(currentExpense);
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
		]);

		await expect(
			useCase.execute({
				expenseId: "expense-1",
				paidByMemberId: "member-b",
			}),
		).rejects.toMatchObject({
			code: "EXPENSE_PAYER_NOT_IN_GROUP",
			statusCode: 400,
		});
		expect(repository.update).not.toHaveBeenCalled();
	});

	it("preserves splits and skips active-member validation for metadata-only updates", async () => {
		repository.findDetailByIdForUser.mockResolvedValue(currentExpense);
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
		]);
		repository.update.mockImplementation((_expenseId, expense) =>
			Promise.resolve({
				...currentExpense,
				title: expense.title,
				currency: expense.currency,
				category: expense.category,
				notes: expense.notes,
				expenseDate: expense.expenseDate,
			}),
		);

		const expenseDate = new Date("2026-06-14T20:00:00.000Z");
		await useCase.execute({
			expenseId: "expense-1",
			title: "Updated title",
			currency: "USD",
			category: "transport",
			notes: "Taxi",
			expenseDate,
		});

		expect(repository.findActiveGroupMembers).not.toHaveBeenCalled();
		expect(repository.update).toHaveBeenCalledTimes(1);
		const [expenseId, updatedExpense, options] = repository.update.mock.calls[0];
		expect(expenseId).toBe("expense-1");
		expect(options).toEqual({ replaceSplits: false });
		expect(updatedExpense.splits).toEqual(
			currentExpense.participants.map((participant) =>
				expect.objectContaining({
					memberId: participant.memberId,
					displayName: participant.displayName,
					owedAmount: participant.owedAmount,
					paidAmount: participant.paidAmount,
					netAmount: participant.netAmount,
				}),
			),
		);
	});

	it("builds an updated expense and recalculates equal splits", async () => {
		repository.findDetailByIdForUser.mockResolvedValue(currentExpense);
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
			{ id: "member-b", displayName: "Ana" },
			{ id: "member-c", displayName: "Mora" },
		]);
		repository.update.mockImplementation((_expenseId, expense) =>
			Promise.resolve({
				...currentExpense,
				title: expense.title,
				amount: expense.amountValue,
				paidBy: { id: expense.paidByMemberId, displayName: "Ana" },
				participants: expense.splits.map((split) => ({
					memberId: split.memberId,
					displayName: split.displayName,
					owedAmount: split.owedAmount,
					paidAmount: split.paidAmount,
					netAmount: split.netAmount,
				})),
			}),
		);

		const input: UpdateExpenseInput = {
			expenseId: "expense-1",
			title: "Updated dinner",
			amount: 35000,
			paidByMemberId: "member-b",
			participantMemberIds: ["member-b", "member-c"],
		};
		const result = await useCase.execute(input);

		expect(repository.update).toHaveBeenCalledTimes(1);
		const updatedExpense = repository.update.mock.calls[0][1];
		expect(updatedExpense.title).toBe("Updated dinner");
		expect(updatedExpense.amountValue).toBe(35000);
		expect(updatedExpense.splits).toEqual([
			expect.objectContaining({
				memberId: "member-b",
				owedAmount: 17500,
				paidAmount: 35000,
				netAmount: 17500,
			}),
			expect.objectContaining({
				memberId: "member-c",
				owedAmount: 17500,
				paidAmount: 0,
				netAmount: -17500,
			}),
		]);
		expect(result.title).toBe("Updated dinner");
	});
});
