import { ApiProperty } from "@nestjs/swagger";

export class PersonalTransactionResponseDto {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id: string;

	@ApiProperty({ example: "expense" })
	type: string;

	@ApiProperty({ example: "variable", nullable: true })
	expenseKind: string | null;

	@ApiProperty({ example: 15000 })
	amount: number;

	@ApiProperty({ example: "ARS" })
	currency: string;

	@ApiProperty({ example: "Salud" })
	category: string;

	@ApiProperty({ example: "acc-123" })
	accountId: string;

	@ApiProperty({ example: "Pesos" })
	accountName: string;

	@ApiProperty({ example: "2026-06-29T00:00:00.000Z" })
	occurredAt: string;

	@ApiProperty({ example: "Farmacia", nullable: true })
	note: string | null;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	createdAt: string;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	updatedAt: string;
}

export class ListPersonalTransactionsResponseDto {
	@ApiProperty({ type: [PersonalTransactionResponseDto] })
	transactions: PersonalTransactionResponseDto[];

	@ApiProperty({ example: "eyJpZCI6MTAwfQ==", nullable: true })
	nextCursor: string | null;

	@ApiProperty({ example: 876371 })
	total: number;

	@ApiProperty({ example: 500000 })
	incomeTotal: number;

	@ApiProperty({ example: 376371 })
	expenseTotal: number;

	@ApiProperty({ example: "ARS" })
	currency: string;
}
