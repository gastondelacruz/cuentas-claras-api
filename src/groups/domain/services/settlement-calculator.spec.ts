import type { MemberBalance } from "./balance-calculator";
import { calculateSettlements } from "./settlement-calculator";

describe("calculateSettlements", () => {
	it("returns empty suggestions when there are no balances", () => {
		expect(calculateSettlements([])).toEqual([]);
	});

	it("skips members with zero balance", () => {
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: 0, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: 0, currency: "ARS" },
		];

		expect(calculateSettlements(balances)).toEqual([]);
	});

	it("produces one suggestion for a single debtor and a single creditor with exact match", () => {
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: -100, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: 100, currency: "ARS" },
		];

		expect(calculateSettlements(balances)).toEqual([
			{
				fromMemberId: "m1",
				fromMemberName: "Alice",
				toMemberId: "m2",
				toMemberName: "Bob",
				amount: 100,
				currency: "ARS",
			},
		]);
	});

	it("produces a partial suggestion when debtor owes less than creditor is owed", () => {
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: -30, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: 100, currency: "ARS" },
		];

		const result = calculateSettlements(balances);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			fromMemberId: "m1",
			toMemberId: "m2",
			amount: 30,
			currency: "ARS",
		});
	});

	it("produces minimal transactions for multiple debtors and creditors", () => {
		// Alice: -100, Bob: -50, Carol: +80, Dave: +70
		// Sorted: debtors [Alice -100, Bob -50], creditors [Dave +70, Carol +80]
		// Step 1: Alice pays Dave 70 → Alice: -30, Dave: 0
		// Step 2: Alice pays Carol 30 → Alice: 0, Carol: +50
		// Step 3: Bob pays Carol 50 → Bob: 0, Carol: 0
		// Total: 3 transactions
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: -100, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: -50, currency: "ARS" },
			{ memberId: "m3", displayName: "Carol", balance: 80, currency: "ARS" },
			{ memberId: "m4", displayName: "Dave", balance: 70, currency: "ARS" },
		];

		const result = calculateSettlements(balances);

		// Must settle all debts
		const totalPaid = result.reduce((sum, s) => sum + s.amount, 0);
		expect(totalPaid).toBe(150);

		// Must be minimal: 3 transactions
		expect(result.length).toBeLessThanOrEqual(3);

		// Every suggestion must have correct currency and positive amount
		for (const s of result) {
			expect(s.currency).toBe("ARS");
			expect(s.amount).toBeGreaterThan(0);
		}
	});

	it("handles multiple currencies independently", () => {
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: -50, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: 50, currency: "ARS" },
			{ memberId: "m3", displayName: "Carol", balance: -20, currency: "USD" },
			{ memberId: "m4", displayName: "Dave", balance: 20, currency: "USD" },
		];

		const result = calculateSettlements(balances);

		expect(result).toHaveLength(2);

		const arsSuggestion = result.find((s) => s.currency === "ARS");
		const usdSuggestion = result.find((s) => s.currency === "USD");

		expect(arsSuggestion).toMatchObject({
			fromMemberId: "m1",
			toMemberId: "m2",
			amount: 50,
			currency: "ARS",
		});
		expect(usdSuggestion).toMatchObject({
			fromMemberId: "m3",
			toMemberId: "m4",
			amount: 20,
			currency: "USD",
		});
	});

	it("avoids floating-point drift when computing payments", () => {
		const balances: MemberBalance[] = [
			{ memberId: "m1", displayName: "Alice", balance: -0.1, currency: "ARS" },
			{ memberId: "m2", displayName: "Bob", balance: 0.1, currency: "ARS" },
		];

		const result = calculateSettlements(balances);

		expect(result).toHaveLength(1);
		expect(result[0].amount).toBe(0.1);
	});
});
