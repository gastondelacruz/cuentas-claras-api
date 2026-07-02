import { ApiProperty } from "@nestjs/swagger";
import { ExpensePaidByResponseDto } from "./create-expense-response.dto";

export class ExpenseListItemResponseDto {
	@ApiProperty({ example: "770e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "880e8400-e29b-41d4-a716-446655440000" })
	groupId!: string;

	@ApiProperty({ example: "Dinner" })
	title!: string;

	@ApiProperty({ example: 25000 })
	amount!: number;

	@ApiProperty({ example: "ARS" })
	currency!: string;

	@ApiProperty({ type: ExpensePaidByResponseDto })
	paidBy!: ExpensePaidByResponseDto;

	@ApiProperty({ example: 2 })
	participantsCount!: number;

	@ApiProperty({ example: "food", nullable: true })
	category!: string | null;

	@ApiProperty({ example: "2026-06-29T00:00:00.000Z" })
	expenseDate!: string;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	createdAt!: string;
}

export class ListExpensesResponseDto {
	@ApiProperty({ type: [ExpenseListItemResponseDto] })
	expenses!: ExpenseListItemResponseDto[];

	@ApiProperty({ example: "eyJpZCI6MTAwfQ==", nullable: true })
	nextCursor!: string | null;
}
