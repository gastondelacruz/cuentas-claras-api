import type { CreateExpenseInput } from "../../../application/use-cases/create-expense.use-case";
import type { ExpenseEntity } from "../../../domain/entities/expense-entity";
import type {
	ExpenseDetail,
	ExpenseListPage,
} from "../../../domain/ports/expense.repository";
import { CreateExpenseRequestDto } from "../dto/create-expense-request.dto";
import { CreateExpenseResponseDto } from "../dto/create-expense-response.dto";
import { ListExpensesResponseDto } from "../dto/list-expenses-response.dto";

export class ExpenseMapper {
	static toInput(
		groupId: string,
		dto: CreateExpenseRequestDto,
	): CreateExpenseInput {
		return {
			groupId,
			title: dto.title,
			amount: dto.amount,
			currency: dto.currency,
			paidByMemberId: dto.paidByMemberId,
			participantMemberIds: dto.participantMemberIds,
			splitType: dto.splitType,
			category: dto.category ?? null,
			notes: dto.notes ?? null,
			expenseDate: new Date(dto.expenseDate),
		};
	}

	static toCreateResponseDto(expense: ExpenseEntity): CreateExpenseResponseDto {
		const payerSplit = expense.splits.find(
			(split) => split.memberId === expense.paidByMemberId,
		);

		return {
			id: expense.id,
			groupId: expense.groupId,
			title: expense.title,
			amount: expense.amountValue,
			currency: expense.currency,
			paidBy: {
				id: expense.paidByMemberId,
				displayName: payerSplit?.displayName ?? "",
			},
			participants: expense.splits.map((split) => ({
				memberId: split.memberId,
				displayName: split.displayName ?? "",
				owedAmount: split.owedAmount,
				paidAmount: split.paidAmount,
				netAmount: split.netAmount,
			})),
			splitType: expense.splitType,
			category: expense.category,
			notes: expense.notes,
			expenseDate: expense.expenseDate.toISOString(),
			createdAt: (expense.createdAt ?? expense.expenseDate).toISOString(),
			updatedAt: (expense.updatedAt ?? expense.expenseDate).toISOString(),
		};
	}

	static toListResponseDto(page: ExpenseListPage): ListExpensesResponseDto {
		return {
			expenses: page.expenses.map((expense) => ({
				id: expense.id,
				groupId: expense.groupId,
				title: expense.title,
				amount: expense.amount,
				currency: expense.currency,
				paidBy: expense.paidBy,
				participantsCount: expense.participantsCount,
				category: expense.category,
				expenseDate: expense.expenseDate.toISOString(),
				createdAt: expense.createdAt.toISOString(),
			})),
			nextCursor: page.nextCursor,
		};
	}

	static toDetailResponseDto(expense: ExpenseDetail): CreateExpenseResponseDto {
		return {
			id: expense.id,
			groupId: expense.groupId,
			title: expense.title,
			amount: expense.amount,
			currency: expense.currency,
			paidBy: expense.paidBy,
			participants: expense.participants,
			splitType: expense.splitType,
			category: expense.category,
			notes: expense.notes,
			expenseDate: expense.expenseDate.toISOString(),
			createdAt: expense.createdAt.toISOString(),
			updatedAt: expense.updatedAt.toISOString(),
		};
	}
}
