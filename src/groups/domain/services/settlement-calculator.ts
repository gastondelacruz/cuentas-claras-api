import type { MemberBalance } from "./balance-calculator";

export type SettlementSuggestion = {
	fromMemberId: string;
	fromMemberName: string;
	toMemberId: string;
	toMemberName: string;
	amount: number;
	currency: string;
};

type CentMember = {
	memberId: string;
	displayName: string;
	cents: number;
};

/**
 * Computes the minimum number of settlement transactions needed to settle
 * all debts in a group, grouped by currency.
 *
 * Uses a greedy two-pointer approach:
 * - Sort debtors ascending (most negative first).
 * - Sort creditors descending (most positive first).
 * - Match the largest debtor with the largest creditor at each step.
 *
 * Amounts are handled in integer cents to avoid floating-point drift.
 */
export function calculateSettlements(
	balances: MemberBalance[],
): SettlementSuggestion[] {
	const byCurrency = new Map<string, MemberBalance[]>();

	for (const balance of balances) {
		if (balance.balance === 0) {
			continue;
		}
		const group = byCurrency.get(balance.currency) ?? [];
		group.push(balance);
		byCurrency.set(balance.currency, group);
	}

	const suggestions: SettlementSuggestion[] = [];

	for (const [currency, members] of byCurrency) {
		const debtors: CentMember[] = members
			.filter((m) => m.balance < 0)
			.map((m) => ({
				memberId: m.memberId,
				displayName: m.displayName,
				cents: Math.round(m.balance * 100),
			}))
			.sort((a, b) => a.cents - b.cents); // most negative first

		const creditors: CentMember[] = members
			.filter((m) => m.balance > 0)
			.map((m) => ({
				memberId: m.memberId,
				displayName: m.displayName,
				cents: Math.round(m.balance * 100),
			}))
			.sort((a, b) => b.cents - a.cents); // most positive first

		let di = 0;
		let ci = 0;

		while (di < debtors.length && ci < creditors.length) {
			const debtor = debtors[di];
			const creditor = creditors[ci];

			const paymentCents = Math.min(-debtor.cents, creditor.cents);

			suggestions.push({
				fromMemberId: debtor.memberId,
				fromMemberName: debtor.displayName,
				toMemberId: creditor.memberId,
				toMemberName: creditor.displayName,
				amount: paymentCents / 100,
				currency,
			});

			debtor.cents += paymentCents;
			creditor.cents -= paymentCents;

			if (debtor.cents === 0) {
				di++;
			}
			if (creditor.cents === 0) {
				ci++;
			}
		}
	}

	return suggestions;
}
