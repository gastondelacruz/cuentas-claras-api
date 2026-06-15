import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	ExpenseRepository,
	type ExpenseDetail,
} from "../../domain/ports/expense.repository";

@Injectable()
export class GetExpenseDetailUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(expenseId: string): Promise<ExpenseDetail> {
		const expense = await this.expenseRepository.findDetailByIdForUser({
			expenseId,
			userId: DEV_USER_ID,
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
