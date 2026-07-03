import { type PersonalTransaction } from "../../../domain/ports/personal-transactions.repository";
import { type GetPersonalTransactionsSummaryOutput } from "../../../application/use-cases/get-personal-transactions-summary.use-case";
import { type ListPersonalTransactionsOutput } from "../../../application/use-cases/list-personal-transactions.use-case";
import { type CreatePersonalTransactionResponseDto } from "../dto/create-personal-transaction-response.dto";
import {
	type ListPersonalTransactionsResponseDto,
	type PersonalTransactionResponseDto,
} from "../dto/list-personal-transactions-response.dto";
import { type PersonalTransactionsSummaryResponseDto } from "../dto/personal-transactions-summary-response.dto";

export class PersonalTransactionsMapper {
	static toResponseDto(
		transaction: PersonalTransaction,
	): PersonalTransactionResponseDto {
		return {
			id: transaction.id,
			type: transaction.type,
			amount: transaction.amount,
			currency: transaction.currency,
			category: transaction.category,
			accountId: transaction.accountId,
			accountName: transaction.accountName,
			occurredAt: transaction.occurredAt.toISOString(),
			note: transaction.note,
			createdAt: transaction.createdAt.toISOString(),
			updatedAt: transaction.updatedAt.toISOString(),
		};
	}

	static toResponseListDto(
		output: ListPersonalTransactionsOutput,
	): ListPersonalTransactionsResponseDto {
		return {
			transactions: output.items.map((item) =>
				PersonalTransactionsMapper.toResponseDto(item),
			),
			nextCursor: output.nextCursor
				? PersonalTransactionsMapper.encodeCursor(output.nextCursor)
				: null,
			total: output.totals.total,
			incomeTotal: output.totals.incomeTotal,
			expenseTotal: output.totals.expenseTotal,
			currency: output.totals.currency,
		};
	}

	static toCreateResponseDto(
		transaction: PersonalTransaction,
	): CreatePersonalTransactionResponseDto {
		return PersonalTransactionsMapper.toResponseDto(transaction);
	}

	static toUpdateResponseDto(
		transaction: PersonalTransaction,
	): CreatePersonalTransactionResponseDto {
		return PersonalTransactionsMapper.toResponseDto(transaction);
	}

	static toSummaryResponseDto(
		output: GetPersonalTransactionsSummaryOutput,
	): PersonalTransactionsSummaryResponseDto {
		return {
			total: output.total,
			incomeTotal: output.incomeTotal,
			expenseTotal: output.expenseTotal,
			currency: output.currency,
			breakdown: output.breakdown.map((item) => ({
				category: item.category,
				type: item.type,
				amount: item.amount,
				percentage: item.percentage,
			})),
		};
	}

	static encodeCursor(id: string): string {
		return Buffer.from(id).toString("base64url");
	}

	static decodeCursor(cursor: string): string | undefined {
		try {
			const decoded = Buffer.from(cursor, "base64url").toString("utf8");

			if (!PersonalTransactionsMapper.isUuid(decoded)) {
				return undefined;
			}

			return decoded;
		} catch {
			return undefined;
		}
	}

	private static isUuid(value: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			value,
		);
	}
}
