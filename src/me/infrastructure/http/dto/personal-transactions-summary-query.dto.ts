import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsOptional, IsString } from "class-validator";
import {
	PERSONAL_TRANSACTIONS_RANGES,
	type PersonalTransactionsRange,
} from "./list-personal-transactions-query.dto";

export class PersonalTransactionsSummaryQueryDto {
	@ApiPropertyOptional({
		description:
			'Time range to summarize transactions. Use "period" together with ' +
			'"from" and "to" for a custom date range.',
		enum: PERSONAL_TRANSACTIONS_RANGES,
		example: "week",
		default: "week",
	})
	@IsString()
	@IsIn(PERSONAL_TRANSACTIONS_RANGES)
	range: PersonalTransactionsRange = "week";

	@ApiPropertyOptional({
		description:
			'Start of the custom summary date range (ISO 8601). Required when range="period".',
		example: "2026-06-01T00:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	from?: string;

	@ApiPropertyOptional({
		description:
			'End of the custom summary date range (ISO 8601). Required when range="period".',
		example: "2026-06-30T23:59:59.999Z",
	})
	@IsOptional()
	@IsISO8601()
	to?: string;
}
