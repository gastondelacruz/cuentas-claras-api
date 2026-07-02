export const TRANSACTION_TYPES = ["expense", "income"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export class TransactionTypeValueObject {
	readonly value: TransactionType;

	constructor(value: string) {
		if (!TRANSACTION_TYPES.includes(value as TransactionType)) {
			throw new Error(`Invalid transaction type: ${value}`);
		}

		this.value = value as TransactionType;
	}
}
