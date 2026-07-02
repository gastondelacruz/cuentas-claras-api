export type PersonalTransaction = {
	id: string;
	userId: string;
	accountId: string;
	accountName: string;
	type: string;
	amount: number;
	currency: string;
	category: string;
	occurredAt: Date;
	note: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type CreatePersonalTransactionInput = {
	userId: string;
	accountId: string;
	type: string;
	amount: number;
	currency: string;
	category: string;
	occurredAt: Date;
	note?: string | null;
};

export type PersonalTransactionFilters = {
	userId: string;
	type?: string;
	dateFrom?: Date;
	dateTo?: Date;
	limit: number;
	cursor?: string;
};

export type FindFilteredPersonalTransactionsResult = {
	items: PersonalTransaction[];
	nextCursor: string | null;
};

export abstract class PersonalTransactionsRepository {
	abstract findFiltered(
		filters: PersonalTransactionFilters,
	): Promise<FindFilteredPersonalTransactionsResult>;
	abstract create(
		data: CreatePersonalTransactionInput,
	): Promise<PersonalTransaction>;
}
