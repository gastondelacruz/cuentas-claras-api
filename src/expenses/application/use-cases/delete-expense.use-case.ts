import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	ExpenseRepository,
	type DeletedExpenseRef,
} from "../../domain/ports/expense.repository";

@Injectable()
export class DeleteExpenseUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(expenseId: string): Promise<DeletedExpenseRef> {
		const deleted = await this.expenseRepository.softDeleteForUser({
			expenseId,
			userId: DEV_USER_ID,
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
