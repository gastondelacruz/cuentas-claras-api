import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest uses this abstract class as a runtime DI token.
import { AccountsRepository } from "../../domain/ports/accounts.repository";
// biome-ignore lint/style/useImportType: Nest uses this abstract class as a runtime DI token.
import {
	PersonalTransactionsRepository,
	type PersonalTransaction,
	type UpdatePersonalTransactionData,
} from "../../domain/ports/personal-transactions.repository";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { isValidCategoryForType } from "../../domain/value-objects/transaction-category.vo";
import {
	DEFAULT_TRANSACTION_EXPENSE_KIND,
	type TransactionExpenseKind,
} from "../../domain/value-objects/transaction-expense-kind.vo";
import type { TransactionType } from "../../domain/value-objects/transaction-type.vo";

export type UpdatePersonalTransactionInput = {
	userId: string;
	transactionId: string;
	type?: TransactionType;
	expenseKind?: TransactionExpenseKind;
	amount?: number;
	currency?: string;
	category?: string;
	accountId?: string;
	occurredAt?: Date;
	note?: string | null;
};

@Injectable()
export class UpdatePersonalTransactionUseCase {
	constructor(
		private readonly accountsRepository: AccountsRepository,
		private readonly personalTransactionsRepository: PersonalTransactionsRepository,
	) {}

	async execute(
		input: UpdatePersonalTransactionInput,
	): Promise<PersonalTransaction> {
		const existing =
			await this.personalTransactionsRepository.findByIdAndUserId(
				input.transactionId,
				input.userId,
			);

		if (!existing) {
			throw new BusinessException(
				"PERSONAL_TX_NOT_FOUND",
				"Personal transaction not found.",
				404,
			);
		}

		const nextType = input.type ?? (existing.type as TransactionType);
		const nextCategory = input.category ?? existing.category;

		if (!isValidCategoryForType(nextType, nextCategory)) {
			throw new BusinessException(
				"PERSONAL_TX_CATEGORY_NOT_ALLOWED",
				`Category "${nextCategory}" is not allowed for ${nextType} transactions.`,
				400,
			);
		}

		if (nextType === "income" && input.expenseKind) {
			throw new BusinessException(
				"PERSONAL_TX_EXPENSE_KIND_NOT_ALLOWED",
				"Expense kind is only allowed for expense transactions.",
				400,
			);
		}

		if (input.accountId) {
			const account = await this.accountsRepository.findByIdAndUserId(
				input.accountId,
				input.userId,
			);

			if (!account) {
				throw new BusinessException(
					"PERSONAL_TX_ACCOUNT_NOT_FOUND",
					"Account not found.",
					404,
				);
			}
		}

		const updated = await this.personalTransactionsRepository.update(
			input.transactionId,
			input.userId,
			buildUpdateData(input, nextType, existing.expenseKind),
		);

		if (!updated) {
			throw new BusinessException(
				"PERSONAL_TX_NOT_FOUND",
				"Personal transaction not found.",
				404,
			);
		}

		return updated;
	}
}

function buildUpdateData(
	input: UpdatePersonalTransactionInput,
	nextType: TransactionType,
	existingExpenseKind: TransactionExpenseKind | null,
): UpdatePersonalTransactionData {
	const expenseKind = resolveUpdatedExpenseKind(
		nextType,
		existingExpenseKind,
		input.expenseKind,
	);
	const shouldUpdateExpenseKind =
		input.type !== undefined ||
		input.expenseKind !== undefined ||
		expenseKind !== existingExpenseKind;

	return {
		...(shouldUpdateExpenseKind ? { expenseKind } : {}),
		...(input.type !== undefined ? { type: input.type } : {}),
		...(input.amount !== undefined ? { amount: input.amount } : {}),
		...(input.currency !== undefined ? { currency: input.currency } : {}),
		...(input.category !== undefined ? { category: input.category } : {}),
		...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
		...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
		...(input.note !== undefined ? { note: input.note } : {}),
	};
}

function resolveUpdatedExpenseKind(
	nextType: TransactionType,
	existingExpenseKind: TransactionExpenseKind | null,
	inputExpenseKind?: TransactionExpenseKind,
): TransactionExpenseKind | null {
	if (nextType === "expense") {
		return inputExpenseKind ?? existingExpenseKind ?? DEFAULT_TRANSACTION_EXPENSE_KIND;
	}

	return null;
}
