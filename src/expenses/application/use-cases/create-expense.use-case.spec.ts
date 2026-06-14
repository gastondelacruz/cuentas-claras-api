import { Test, type TestingModule } from "@nestjs/testing";
import { ExpenseEntity } from "../../domain/entities/expense-entity";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import {
	type CreateExpenseInput,
	CreateExpenseUseCase,
} from "./create-expense.use-case";

describe("CreateExpenseUseCase", () => {
	let useCase: CreateExpenseUseCase;
	let repository: {
		findActiveGroupMembers: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
	};

	const baseInput: CreateExpenseInput = {
		groupId: "group-1",
		title: "Dinner",
		amount: 30000,
		currency: "ARS",
		paidByMemberId: "member-a",
		participantMemberIds: ["member-a", "member-b"],
		splitType: "equal",
		category: "food",
		notes: "Pizza night",
		expenseDate: new Date("2026-06-13T20:00:00.000Z"),
	};

	beforeEach(async () => {
		repository = {
			findActiveGroupMembers: vi.fn(),
			create: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CreateExpenseUseCase,
				{
					provide: ExpenseRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(CreateExpenseUseCase);
	});

	it("throws GROUP_NOT_FOUND when the group does not exist", async () => {
		repository.findActiveGroupMembers.mockResolvedValue(null);

		await expect(useCase.execute(baseInput)).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			statusCode: 404,
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it("throws EXPENSE_PAYER_NOT_IN_GROUP when the payer is not an active member", async () => {
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-b", displayName: "Ana" },
		]);

		await expect(useCase.execute(baseInput)).rejects.toMatchObject({
			code: "EXPENSE_PAYER_NOT_IN_GROUP",
			statusCode: 400,
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it("throws EXPENSE_PARTICIPANT_NOT_IN_GROUP when a participant is not an active member", async () => {
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
		]);

		await expect(useCase.execute(baseInput)).rejects.toMatchObject({
			code: "EXPENSE_PARTICIPANT_NOT_IN_GROUP",
			statusCode: 400,
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it("throws EXPENSE_PAYER_NOT_PARTICIPANT when the payer is not part of the participants", async () => {
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
			{ id: "member-b", displayName: "Ana" },
		]);

		await expect(
			useCase.execute({
				...baseInput,
				paidByMemberId: "member-a",
				participantMemberIds: ["member-b"],
			}),
		).rejects.toMatchObject({
			code: "EXPENSE_PAYER_NOT_PARTICIPANT",
			statusCode: 400,
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it("builds the expense with an equal split and delegates persistence to the repository", async () => {
		repository.findActiveGroupMembers.mockResolvedValue([
			{ id: "member-a", displayName: "Gaston" },
			{ id: "member-b", displayName: "Ana" },
		]);
		repository.create.mockImplementation(
			(expense: ExpenseEntity) => Promise.resolve(expense),
		);

		const result = await useCase.execute(baseInput);

		expect(repository.create).toHaveBeenCalledTimes(1);
		const persisted = repository.create.mock.calls[0][0] as ExpenseEntity;
		expect(persisted).toBeInstanceOf(ExpenseEntity);
		expect(persisted.groupId).toBe("group-1");
		expect(persisted.amountValue).toBe(30000);
		expect(persisted.splits).toEqual([
			expect.objectContaining({
				memberId: "member-a",
				displayName: "Gaston",
				owedAmount: 15000,
				paidAmount: 30000,
				netAmount: 15000,
			}),
			expect.objectContaining({
				memberId: "member-b",
				displayName: "Ana",
				owedAmount: 15000,
				paidAmount: 0,
				netAmount: -15000,
			}),
		]);
		expect(result).toBe(persisted);
	});
});
