import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	ExpenseRepository,
	type ExpenseListPage,
} from "../../domain/ports/expense.repository";

export type ListGroupExpensesInput = {
	groupId: string;
	limit: number;
	cursor?: string;
};

@Injectable()
export class ListGroupExpensesUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(input: ListGroupExpensesInput): Promise<ExpenseListPage> {
		const page = await this.expenseRepository.listByGroupForUser({
			groupId: input.groupId,
			userId: DEV_USER_ID,
			limit: input.limit,
			cursor: input.cursor,
		});

		if (page === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return page;
	}
}
