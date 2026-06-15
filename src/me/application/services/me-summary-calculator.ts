import type { MeSummaryCurrencyTotals } from "../../domain/ports/me-summary.repository";

export type MeSummaryPaidExpense = {
	currency: string;
	amount: number;
};

export type MeSummaryExpenseSplit = {
	currency: string;
	netAmount: number;
};

export type MeSummarySettlementMovement = {
	currency: string;
	amount: number;
	direction: "incoming" | "outgoing";
};

type MutableCurrencyTotals = {
	totalPaidCents: number;
	netBalanceCents: number;
};

export function calculateMeSummaryTotals(input: {
	paidExpenses: MeSummaryPaidExpense[];
	splits: MeSummaryExpenseSplit[];
	settlements: MeSummarySettlementMovement[];
}): MeSummaryCurrencyTotals[] {
	const totalsByCurrency = new Map<string, MutableCurrencyTotals>();

	for (const paidExpense of input.paidExpenses) {
		getMutableCurrencyTotals(
			totalsByCurrency,
			paidExpense.currency,
		).totalPaidCents += toCents(paidExpense.amount);
	}

	for (const split of input.splits) {
		getMutableCurrencyTotals(
			totalsByCurrency,
			split.currency,
		).netBalanceCents += toCents(split.netAmount);
	}

	for (const settlement of input.settlements) {
		const currencyTotals = getMutableCurrencyTotals(
			totalsByCurrency,
			settlement.currency,
		);
		const amountCents = toCents(settlement.amount);

		if (settlement.direction === "outgoing") {
			currencyTotals.netBalanceCents += amountCents;
			continue;
		}

		currencyTotals.netBalanceCents -= amountCents;
	}

	return [...totalsByCurrency.entries()]
		.sort(([leftCurrency], [rightCurrency]) => leftCurrency.localeCompare(rightCurrency))
		.map(([currency, totals]) => ({
			currency,
			totalPaid: totals.totalPaidCents / 100,
			totalOwed: Math.max(-totals.netBalanceCents, 0) / 100,
			totalToReceive: Math.max(totals.netBalanceCents, 0) / 100,
		}));
}

/**
 * Returns the earliest membership date from a list of memberships,
 * or null when the list is empty.
 */
export function calculateActiveSince(
	memberships: ReadonlyArray<{ createdAt: Date }>,
): Date | null {
	return memberships.reduce<Date | null>(
		(earliest, member) =>
			earliest === null || member.createdAt < earliest ? member.createdAt : earliest,
		null,
	);
}

function getMutableCurrencyTotals(
	totalsByCurrency: Map<string, MutableCurrencyTotals>,
	currency: string,
): MutableCurrencyTotals {
	const existingTotals = totalsByCurrency.get(currency);

	if (existingTotals) {
		return existingTotals;
	}

	const totals = {
		totalPaidCents: 0,
		netBalanceCents: 0,
	};
	totalsByCurrency.set(currency, totals);

	return totals;
}

function toCents(amount: number): number {
	return Math.round(amount * 100);
}
