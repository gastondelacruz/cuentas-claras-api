export class ExpensePaidByResponseDto {
	id!: string;
	displayName!: string;
}

export class ExpenseParticipantResponseDto {
	memberId!: string;
	displayName!: string;
	owedAmount!: number;
	paidAmount!: number;
	netAmount!: number;
}

export class CreateExpenseResponseDto {
	id!: string;
	groupId!: string;
	title!: string;
	amount!: number;
	currency!: string;
	paidBy!: ExpensePaidByResponseDto;
	participants!: ExpenseParticipantResponseDto[];
	splitType!: string;
	category!: string | null;
	notes!: string | null;
	expenseDate!: string;
	createdAt!: string;
	updatedAt!: string;
}
