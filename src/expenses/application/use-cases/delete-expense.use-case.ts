import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	ExpenseRepository,
	type DeletedExpenseRef,
} from "../../domain/ports/expense.repository";

@Injectable()
export class DeleteExpenseUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(userId: string, expenseId: string): Promise<DeletedExpenseRef> {
		const deleted = await this.expenseRepository.softDeleteForUser({
			expenseId,
			userId,
		});

		if (deleted === null) {
			throw new BusinessException(
				"EXPENSE_NOT_FOUND",
				"Expense not found.",
				404,
			);
		}

		return deleted;
	}
}
