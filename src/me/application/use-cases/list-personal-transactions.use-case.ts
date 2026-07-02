import { Injectable } from "@nestjs/common";
import { type TransactionType } from "../../domain/value-objects/transaction-type.vo";
import { type TransactionPeriod } from "../../domain/value-objects/transaction-period.vo";
import {
	PersonalTransactionsRepository,
	type PersonalTransaction,
} from "../../domain/ports/personal-transactions.repository";
import { calculatePersonalTransactionsTotals } from "../services/personal-transactions-totals.calculator";
import { resolveDateRange } from "../services/resolve-date-range";

export type ListPersonalTransactionsInput = {
	userId: string;
	type?: TransactionType;
	period?: TransactionPeriod;
	dateFrom?: Date;
	dateTo?: Date;
	limit: number;
	cursor?: string;
};

export type ListPersonalTransactionsTotals = {
	incomeTotal: number;
	expenseTotal: number;
	total: number;
	currency: string;
};

export type ListPersonalTransactionsOutput = {
	items: PersonalTransaction[];
	nextCursor: string | null;
	totals: ListPersonalTransactionsTotals;
};

@Injectable()
export class ListPersonalTransactionsUseCase {
	constructor(
		private readonly personalTransactionsRepository: PersonalTransactionsRepository,
	) {}

	async execute(
		input: ListPersonalTransactionsInput,
	): Promise<ListPersonalTransactionsOutput> {
		const dateRange = resolveDateRange(
			{
				period: input.period,
				dateFrom: input.dateFrom,
				dateTo: input.dateTo,
			},
			new Date(),
		);

		const { items, nextCursor } =
			await this.personalTransactionsRepository.findFiltered({
				userId: input.userId,
				type: input.type,
				dateFrom: dateRange?.gte,
				dateTo: dateRange?.lt,
				limit: input.limit,
				cursor: input.cursor,
			});

		const totals = calculatePersonalTransactionsTotals(items);

		return {
			items,
			nextCursor,
			totals: {
				...totals,
				currency: "ARS",
			},
		};
	}
}
