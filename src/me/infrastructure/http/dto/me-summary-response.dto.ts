import { ApiProperty } from "@nestjs/swagger";

export class MeSummaryCurrencyTotalsResponseDto {
	@ApiProperty({ example: "ARS" })
	currency: string;

	@ApiProperty({ example: 120000 })
	totalPaid: number;

	@ApiProperty({ example: 25000 })
	totalOwed: number;

	@ApiProperty({ example: 40000 })
	totalToReceive: number;
}

export class MeSummaryResponseDto {
	@ApiProperty({ example: 3 })
	totalGroups: number;

	@ApiProperty({ example: 12 })
	totalExpenses: number;

	@ApiProperty({ type: [MeSummaryCurrencyTotalsResponseDto] })
	totalsByCurrency: MeSummaryCurrencyTotalsResponseDto[];

	@ApiProperty({ example: "2026-06-01T00:00:00.000Z", nullable: true })
	activeSince: string | null;
}

export class MeSummaryEnvelopeResponseDto {
	@ApiProperty({
		type: MeSummaryResponseDto,
		description: "ResponseInterceptor wraps successful responses in this data envelope.",
	})
	data: MeSummaryResponseDto;
}
