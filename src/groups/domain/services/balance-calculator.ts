import type { GroupLedger } from "../ports/group.repository";

export type MemberBalance = {
	memberId: string;
	displayName: string;
	balance: number;
	currency: string;
};

type BalanceAccumulator = {
	memberId: string;
	currency: string;
	cents: number;
};

/**
 * Computes per-member balances for a group from its ledger.
 *
 * Sign convention:
 * - Expense split net amounts are added as-is. Positive means the member
 *   should receive money; negative means the member owes money.
 * - A settlement payment moves money from the payer to the receiver. The
 *   payer settles debt, so their balance rises (+amount). The receiver
 *   collects what was owed, so their balance falls (-amount).
 *
 * Balances are accumulated in integer cents to avoid floating point drift
 * and grouped by member and currency.
 */
export function calculateGroupBalances(ledger: GroupLedger): MemberBalance[] {
	const displayNames = new Map<string, string>();
	for (const member of ledger.members) {
		displayNames.set(member.memberId, member.displayName);
	}

	const accumulators = new Map<string, BalanceAccumulator>();

	const add = (memberId: string, currency: string, cents: number): void => {
		const key = `${memberId}::${currency}`;
		const existing = accumulators.get(key);

		if (existing) {
			existing.cents += cents;
			return;
		}

		accumulators.set(key, { memberId, currency, cents });
	};

	for (const split of ledger.splits) {
		add(split.memberId, split.currency, toCents(split.netAmount));
	}

	for (const settlement of ledger.settlements) {
		const cents = toCents(settlement.amount);
		add(settlement.fromMemberId, settlement.currency, cents);
		add(settlement.toMemberId, settlement.currency, -cents);
	}

	const balances: MemberBalance[] = [];
	for (const accumulator of accumulators.values()) {
		balances.push({
			memberId: accumulator.memberId,
			displayName: displayNames.get(accumulator.memberId) ?? "",
			balance: accumulator.cents / 100,
			currency: accumulator.currency,
		});
	}

	balances.sort(
		(a, b) =>
			b.balance - a.balance ||
			a.displayName.localeCompare(b.displayName) ||
			a.currency.localeCompare(b.currency),
	);

	return balances;
}

/**
 * Resolves the signed balance of a single member in a given currency.
 *
 * Reuses {@link calculateGroupBalances} so the sign convention is identical to
 * the group balances endpoint:
 * - Positive: other members owe money to this member.
 * - Negative: this member owes money to other members.
 * - Zero: the member is settled (or has no activity in that currency).
 */
export function calculateMemberBalance(
	ledger: GroupLedger,
	memberId: string,
	currency: string,
): number {
	const balances = calculateGroupBalances(ledger);
	const memberBalance = balances.find(
		(balance) => balance.memberId === memberId && balance.currency === currency,
	);

	return memberBalance?.balance ?? 0;
}

function toCents(amount: number): number {
	return Math.round(amount * 100);
}
