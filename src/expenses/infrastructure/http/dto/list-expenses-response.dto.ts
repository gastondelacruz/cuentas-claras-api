import { ExpensePaidByResponseDto } from "./create-expense-response.dto";

export class ExpenseListItemResponseDto {
	id!: string;
	groupId!: string;
	title!: string;
	amount!: number;
	currency!: string;
	paidBy!: ExpensePaidByResponseDto;
	participantsCount!: number;
	category!: string | null;
	expenseDate!: string;
	createdAt!: string;
}

export class ListExpensesResponseDto {
	expenses!: ExpenseListItemResponseDto[];
	nextCursor!: string | null;
}
