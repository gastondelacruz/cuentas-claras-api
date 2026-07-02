import { Injectable } from "@nestjs/common";
import { AccountsRepository } from "../../domain/ports/accounts.repository";
import {
	PersonalTransactionsRepository,
	type PersonalTransaction,
} from "../../domain/ports/personal-transactions.repository";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { isValidCategoryForType } from "../../domain/value-objects/transaction-category.vo";
import { type TransactionType } from "../../domain/value-objects/transaction-type.vo";

export type CreatePersonalTransactionInput = {
	userId: string;
	accountId?: string;
	type: TransactionType;
	amount: number;
	currency: string;
	category: string;
	occurredAt: Date;
	note?: string | null;
};

@Injectable()
export class CreatePersonalTransactionUseCase {
	constructor(
		private readonly accountsRepository: AccountsRepository,
		private readonly personalTransactionsRepository: PersonalTransactionsRepository,
	) {}

	async execute(
		input: CreatePersonalTransactionInput,
	): Promise<PersonalTransaction> {
		if (!isValidCategoryForType(input.type, input.category)) {
			throw new BusinessException(
				"PERSONAL_TX_CATEGORY_NOT_ALLOWED",
				`Category "${input.category}" is not allowed for ${input.type} transactions.`,
				400,
			);
		}

		const accountId = await this.resolveAccountId(input);

		return this.personalTransactionsRepository.create({
			userId: input.userId,
			accountId,
			type: input.type,
			amount: input.amount,
			currency: input.currency,
			category: input.category,
			occurredAt: input.occurredAt,
			note: input.note ?? null,
		});
	}

	private async resolveAccountId(
		input: CreatePersonalTransactionInput,
	): Promise<string> {
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

			return account.id;
		}

		const defaultAccount =
			await this.accountsRepository.findDefaultByUserId(input.userId);

		if (!defaultAccount) {
			throw new BusinessException(
				"PERSONAL_TX_NO_DEFAULT_ACCOUNT",
				"No default account found for the user.",
				400,
			);
		}

		return defaultAccount.id;
	}
}
