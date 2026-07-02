import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsISO8601,
	IsOptional,
	IsString,
	Max,
	Min,
} from "class-validator";
import { TRANSACTION_PERIODS } from "../../../domain/value-objects/transaction-period.vo";
import { TRANSACTION_TYPES } from "../../../domain/value-objects/transaction-type.vo";

/**
 * Public HTTP contract values for the "range" query parameter. This is a
 * superset of the domain TransactionPeriod: "period" is an HTTP-only
 * sentinel meaning "use the explicit from/to date range" and never reaches
 * the domain/application layer as a period value.
 */
export const PERSONAL_TRANSACTIONS_RANGES = [
	...TRANSACTION_PERIODS,
	"period",
] as const;

export type PersonalTransactionsRange =
	(typeof PERSONAL_TRANSACTIONS_RANGES)[number];

export class ListPersonalTransactionsQueryDto {
	@ApiPropertyOptional({
		description:
			'Time range to filter transactions. Use "period" together with ' +
			'"from" and "to" for a custom date range.',
		enum: PERSONAL_TRANSACTIONS_RANGES,
		example: "week",
		default: "week",
	})
	@IsString()
	range: PersonalTransactionsRange = "week";

	@ApiPropertyOptional({
		description: "Filter by transaction type.",
		enum: TRANSACTION_TYPES,
		example: "expense",
	})
	@IsOptional()
	@IsString()
	@IsIn(TRANSACTION_TYPES)
	type?: string;

	@ApiPropertyOptional({
		description:
			'Start of the custom date range (ISO 8601). Required when range="period".',
		example: "2026-06-01T00:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	from?: string;

	@ApiPropertyOptional({
		description:
			'End of the custom date range (ISO 8601). Required when range="period".',
		example: "2026-06-30T23:59:59.999Z",
	})
	@IsOptional()
	@IsISO8601()
	to?: string;

	@ApiPropertyOptional({
		description: "Opaque pagination cursor, taken from a previous nextCursor.",
		example: "eyJpZCI6MTAwfQ==",
	})
	@IsOptional()
	@IsString()
	cursor?: string;

	@ApiPropertyOptional({
		description: "Maximum number of transactions to return per page.",
		example: 20,
		default: 20,
		minimum: 1,
		maximum: 100,
	})
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit = 20;
}
