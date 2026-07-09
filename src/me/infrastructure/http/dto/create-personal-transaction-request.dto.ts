import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsISO8601,
	IsIn,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
	MaxLength,
} from "class-validator";
import { TRANSACTION_EXPENSE_KINDS } from "../../../domain/value-objects/transaction-expense-kind.vo";
import { TRANSACTION_TYPES } from "../../../domain/value-objects/transaction-type.vo";

export class CreatePersonalTransactionRequestDto {
	@ApiPropertyOptional({
		description:
			"Account to record the transaction in. Defaults to the user's default account when omitted.",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@IsOptional()
	@IsUUID()
	accountId?: string;

	@ApiProperty({
		description: "Transaction type.",
		enum: TRANSACTION_TYPES,
		example: "expense",
	})
	@IsString()
	@IsIn(TRANSACTION_TYPES)
	type: string;

	@ApiPropertyOptional({
		description:
			"Expense kind. Applies only to expense transactions and defaults to variable when omitted.",
		enum: TRANSACTION_EXPENSE_KINDS,
		example: "variable",
	})
	@IsOptional()
	@IsString()
	@IsIn(TRANSACTION_EXPENSE_KINDS)
	expenseKind?: string;

	@ApiProperty({
		description: "Transaction amount. Must be a positive number.",
		example: 1500,
	})
	@IsNumber()
	@IsPositive()
	amount: number;

	@ApiProperty({
		description: "ISO 4217 currency code.",
		example: "ARS",
	})
	@IsString()
	currency: string;

	@ApiProperty({
		description:
			"Category name. Allowed values depend on the transaction type.",
		example: "Alimentación",
	})
	@IsString()
	category: string;

	@ApiProperty({
		description: "Date and time the transaction occurred (ISO 8601).",
		example: "2026-06-29T12:00:00.000Z",
	})
	@IsISO8601()
	occurredAt: string;

	@ApiPropertyOptional({
		description: "Optional free-text note, up to 200 characters.",
		example: "Farmacia",
		maxLength: 200,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200)
	note?: string;
}
