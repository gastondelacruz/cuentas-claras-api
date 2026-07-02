export type TransactionForTotals = {
	type: string;
	amount: number;
};

export type PersonalTransactionsTotals = {
	incomeTotal: number;
	expenseTotal: number;
	total: number;
};

export function calculatePersonalTransactionsTotals(
	transactions: ReadonlyArray<TransactionForTotals>,
): PersonalTransactionsTotals {
	let incomeCents = 0;
	let expenseCents = 0;

	for (const transaction of transactions) {
		if (transaction.type === "income") {
			incomeCents += toCents(transaction.amount);
			continue;
		}

		expenseCents += toCents(transaction.amount);
	}

	return {
		incomeTotal: incomeCents / 100,
		expenseTotal: expenseCents / 100,
		total: (incomeCents - expenseCents) / 100,
	};
}

function toCents(amount: number): number {
	return Math.round(amount * 100);
}
