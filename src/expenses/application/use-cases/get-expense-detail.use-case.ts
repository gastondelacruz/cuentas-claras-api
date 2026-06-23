import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	ExpenseRepository,
	type ExpenseDetail,
} from "../../domain/ports/expense.repository";

@Injectable()
export class GetExpenseDetailUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(userId: string, expenseId: string): Promise<ExpenseDetail> {
		const expense = await this.expenseRepository.findDetailByIdForUser({
			expenseId,
			userId,
		});

		if (expense === null) {
			throw new BusinessException(
				"EXPENSE_NOT_FOUND",
				"Expense not found.",
				404,
			);
		}

		return expense;
	}
}
