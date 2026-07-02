import { Injectable } from "@nestjs/common";
import {
	PersonalTransactionsRepository,
	type PersonalTransactionsSummaryBreakdown,
} from "../../domain/ports/personal-transactions.repository";
import { type TransactionPeriod } from "../../domain/value-objects/transaction-period.vo";
import { resolveDateRange } from "../services/resolve-date-range";

export type GetPersonalTransactionsSummaryInput = {
	userId: string;
	period?: TransactionPeriod;
	dateFrom?: Date;
	dateTo?: Date;
};

export type PersonalTransactionsSummaryBreakdownOutput =
	PersonalTransactionsSummaryBreakdown & {
		percentage: number;
	};

export type GetPersonalTransactionsSummaryOutput = {
	total: number;
	incomeTotal: number;
	expenseTotal: number;
	currency: string;
	breakdown: PersonalTransactionsSummaryBreakdownOutput[];
};

@Injectable()
export class GetPersonalTransactionsSummaryUseCase {
	constructor(
		private readonly personalTransactionsRepository: PersonalTransactionsRepository,
	) {}

	async execute(
		input: GetPersonalTransactionsSummaryInput,
	): Promise<GetPersonalTransactionsSummaryOutput> {
		const dateRange = resolveDateRange(
			{
				period: input.period ?? "week",
				dateFrom: input.dateFrom,
				dateTo: input.dateTo,
			},
			new Date(),
		);

		const summary = await this.personalTransactionsRepository.getSummary({
			userId: input.userId,
			dateFrom: dateRange?.gte,
			dateTo: dateRange?.lt,
		});

		return {
			total: subtractMoney(summary.incomeTotal, summary.expenseTotal),
			incomeTotal: summary.incomeTotal,
			expenseTotal: summary.expenseTotal,
			currency: "ARS",
			breakdown: summary.breakdown.map((item) => ({
				...item,
				percentage: calculatePercentage(
					item.amount,
					item.type === "income" ? summary.incomeTotal : summary.expenseTotal,
				),
			})),
		};
	}
}

function calculatePercentage(amount: number, total: number): number {
	const totalCents = toCents(total);

	if (totalCents === 0) {
		return 0;
	}

	return Math.round((toCents(amount) / totalCents) * 10000) / 100;
}

function subtractMoney(left: number, right: number): number {
	return (toCents(left) - toCents(right)) / 100;
}

function toCents(amount: number): number {
	return Math.round(amount * 100);
}
