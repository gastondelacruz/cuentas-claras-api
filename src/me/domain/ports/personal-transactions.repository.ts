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

export type UpdatePersonalTransactionData = {
	accountId?: string;
	type?: string;
	amount?: number;
	currency?: string;
	category?: string;
	occurredAt?: Date;
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

export type PersonalTransactionsSummaryFilters = {
	userId: string;
	dateFrom?: Date;
	dateTo?: Date;
};

export type PersonalTransactionsSummaryBreakdown = {
	category: string;
	type: string;
	amount: number;
};

export type PersonalTransactionsSummary = {
	incomeTotal: number;
	expenseTotal: number;
	breakdown: PersonalTransactionsSummaryBreakdown[];
};

export type FindFilteredPersonalTransactionsResult = {
	items: PersonalTransaction[];
	nextCursor: string | null;
};

export abstract class PersonalTransactionsRepository {
	abstract findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<PersonalTransaction | null>;
	abstract findFiltered(
		filters: PersonalTransactionFilters,
	): Promise<FindFilteredPersonalTransactionsResult>;
	abstract getSummary(
		filters: PersonalTransactionsSummaryFilters,
	): Promise<PersonalTransactionsSummary>;
	abstract create(
		data: CreatePersonalTransactionInput,
	): Promise<PersonalTransaction>;
	abstract update(
		id: string,
		userId: string,
		data: UpdatePersonalTransactionData,
	): Promise<PersonalTransaction | null>;
}
