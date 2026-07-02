import { ApiProperty } from "@nestjs/swagger";

export class PersonalTransactionsSummaryBreakdownResponseDto {
	@ApiProperty({ example: "Food" })
	category: string;

	@ApiProperty({ example: "expense" })
	type: string;

	@ApiProperty({ example: 15000 })
	amount: number;

	@ApiProperty({ example: 75 })
	percentage: number;
}

export class PersonalTransactionsSummaryResponseDto {
	@ApiProperty({ example: 123629 })
	total: number;

	@ApiProperty({ example: 500000 })
	incomeTotal: number;

	@ApiProperty({ example: 376371 })
	expenseTotal: number;

	@ApiProperty({ example: "ARS" })
	currency: string;

	@ApiProperty({ type: [PersonalTransactionsSummaryBreakdownResponseDto] })
	breakdown: PersonalTransactionsSummaryBreakdownResponseDto[];
}
