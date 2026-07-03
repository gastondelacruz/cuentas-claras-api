import { ApiPropertyOptional } from "@nestjs/swagger";
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
import { TRANSACTION_TYPES } from "../../../domain/value-objects/transaction-type.vo";

export class UpdatePersonalTransactionRequestDto {
	@ApiPropertyOptional({
		description: "Updated transaction type.",
		enum: TRANSACTION_TYPES,
		example: "expense",
	})
	@IsOptional()
	@IsString()
	@IsIn(TRANSACTION_TYPES)
	type?: string;

	@ApiPropertyOptional({
		description: "Updated transaction amount. Must be a positive number.",
		example: 1500,
	})
	@IsOptional()
	@IsNumber()
	@IsPositive()
	amount?: number;

	@ApiPropertyOptional({
		description: "Updated ISO 4217 currency code.",
		example: "ARS",
	})
	@IsOptional()
	@IsString()
	currency?: string;

	@ApiPropertyOptional({
		description: "Updated category name. Allowed values depend on the transaction type.",
		example: "Alimentación",
	})
	@IsOptional()
	@IsString()
	category?: string;

	@ApiPropertyOptional({
		description: "Updated account that owns the transaction.",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@IsOptional()
	@IsUUID()
	accountId?: string;

	@ApiPropertyOptional({
		description: "Updated date and time the transaction occurred (ISO 8601).",
		example: "2026-06-29T12:00:00.000Z",
	})
	@IsOptional()
	@IsISO8601()
	occurredAt?: string;

	@ApiPropertyOptional({
		description: "Updated free-text note, up to 200 characters. Use null to clear it.",
		example: "Farmacia",
		maxLength: 200,
		nullable: true,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200)
	note?: string | null;
}
