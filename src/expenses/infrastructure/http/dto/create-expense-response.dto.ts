import { ApiProperty } from "@nestjs/swagger";

export class ExpensePaidByResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "Ada Lovelace" })
	displayName!: string;
}

export class ExpenseParticipantResponseDto {
	@ApiProperty({ example: "660e8400-e29b-41d4-a716-446655440000" })
	memberId!: string;

	@ApiProperty({ example: "Grace Hopper" })
	displayName!: string;

	@ApiProperty({ example: 12500 })
	owedAmount!: number;

	@ApiProperty({ example: 25000 })
	paidAmount!: number;

	@ApiProperty({ example: 12500 })
	netAmount!: number;
}

export class CreateExpenseResponseDto {
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

	@ApiProperty({ type: [ExpenseParticipantResponseDto] })
	participants!: ExpenseParticipantResponseDto[];

	@ApiProperty({ example: "equal" })
	splitType!: string;

	@ApiProperty({ example: "food", nullable: true })
	category!: string | null;

	@ApiProperty({ example: "Birthday dinner", nullable: true })
	notes!: string | null;

	@ApiProperty({ example: "2026-06-29T00:00:00.000Z" })
	expenseDate!: string;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	createdAt!: string;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	updatedAt!: string;
}
