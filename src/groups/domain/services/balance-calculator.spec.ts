import type { GroupLedger } from "../ports/group.repository";
import {
	calculateGroupBalances,
	calculateMemberBalance,
} from "./balance-calculator";

describe("calculateGroupBalances", () => {
	it("returns an empty list when there is no activity", () => {
		const ledger: GroupLedger = {
			members: [{ memberId: "m1", displayName: "Gaston" }],
			splits: [],
			settlements: [],
		};

		expect(calculateGroupBalances(ledger)).toEqual([]);
	});

	it("sums expense split net amounts per member", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "m1", displayName: "Gaston" },
				{ memberId: "m2", displayName: "Ana" },
			],
			splits: [
				{ memberId: "m1", netAmount: 15000, currency: "ARS" },
				{ memberId: "m2", netAmount: -15000, currency: "ARS" },
			],
			settlements: [],
		};

		expect(calculateGroupBalances(ledger)).toEqual([
			{ memberId: "m1", displayName: "Gaston", balance: 15000, currency: "ARS" },
			{ memberId: "m2", displayName: "Ana", balance: -15000, currency: "ARS" },
		]);
	});

	it("a settlement raises the payer balance and lowers the receiver balance", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "debtor", displayName: "Ana" },
				{ memberId: "creditor", displayName: "Gaston" },
			],
			splits: [
				{ memberId: "creditor", netAmount: 15000, currency: "ARS" },
				{ memberId: "debtor", netAmount: -15000, currency: "ARS" },
			],
			settlements: [
				{
					fromMemberId: "debtor",
					toMemberId: "creditor",
					amount: 15000,
					currency: "ARS",
				},
			],
		};

		expect(calculateGroupBalances(ledger)).toEqual([
			{ memberId: "debtor", displayName: "Ana", balance: 0, currency: "ARS" },
			{ memberId: "creditor", displayName: "Gaston", balance: 0, currency: "ARS" },
		]);
	});

	it("keeps balances separated per currency", () => {
		const ledger: GroupLedger = {
			members: [{ memberId: "m1", displayName: "Gaston" }],
			splits: [
				{ memberId: "m1", netAmount: 100, currency: "ARS" },
				{ memberId: "m1", netAmount: 50, currency: "USD" },
			],
			settlements: [],
		};

		expect(calculateGroupBalances(ledger)).toEqual([
			{ memberId: "m1", displayName: "Gaston", balance: 100, currency: "ARS" },
			{ memberId: "m1", displayName: "Gaston", balance: 50, currency: "USD" },
		]);
	});

	it("aggregates fractional amounts without floating point drift", () => {
		const ledger: GroupLedger = {
			members: [{ memberId: "m1", displayName: "Gaston" }],
			splits: [
				{ memberId: "m1", netAmount: 0.1, currency: "ARS" },
				{ memberId: "m1", netAmount: 0.2, currency: "ARS" },
			],
			settlements: [],
		};

		expect(calculateGroupBalances(ledger)).toEqual([
			{ memberId: "m1", displayName: "Gaston", balance: 0.3, currency: "ARS" },
		]);
	});

	it("orders by balance descending, then display name, then currency", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "m1", displayName: "Ana" },
				{ memberId: "m2", displayName: "Bruno" },
				{ memberId: "m3", displayName: "Carla" },
			],
			splits: [
				{ memberId: "m1", netAmount: -100, currency: "ARS" },
				{ memberId: "m2", netAmount: 200, currency: "ARS" },
				{ memberId: "m3", netAmount: -100, currency: "ARS" },
			],
			settlements: [],
		};

		expect(calculateGroupBalances(ledger).map((b) => b.displayName)).toEqual([
			"Bruno",
			"Ana",
			"Carla",
		]);
	});
});

describe("calculateMemberBalance", () => {
	it("returns the negative balance for a member who owes money", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "gaston", displayName: "Gaston" },
				{ memberId: "cami", displayName: "cami.iriso" },
			],
			splits: [
				{ memberId: "cami", netAmount: 250670, currency: "ARS" },
				{ memberId: "gaston", netAmount: -250670, currency: "ARS" },
			],
			settlements: [],
		};

		expect(calculateMemberBalance(ledger, "gaston", "ARS")).toBe(-250670);
	});

	it("returns the positive balance for a member owed money", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "gaston", displayName: "Gaston" },
				{ memberId: "test", displayName: "test" },
			],
			splits: [
				{ memberId: "gaston", netAmount: 500, currency: "ARS" },
				{ memberId: "test", netAmount: -500, currency: "ARS" },
			],
			settlements: [],
		};

		expect(calculateMemberBalance(ledger, "gaston", "ARS")).toBe(500);
	});

	it("returns zero when the member has no activity in the currency", () => {
		const ledger: GroupLedger = {
			members: [{ memberId: "gaston", displayName: "Gaston" }],
			splits: [],
			settlements: [],
		};

		expect(calculateMemberBalance(ledger, "gaston", "ARS")).toBe(0);
	});

	it("returns zero when the member has no balance in the requested currency", () => {
		const ledger: GroupLedger = {
			members: [{ memberId: "gaston", displayName: "Gaston" }],
			splits: [{ memberId: "gaston", netAmount: 100, currency: "USD" }],
			settlements: [],
		};

		expect(calculateMemberBalance(ledger, "gaston", "ARS")).toBe(0);
	});

	it("applies settlements with the same sign convention as the balances endpoint", () => {
		const ledger: GroupLedger = {
			members: [
				{ memberId: "debtor", displayName: "Ana" },
				{ memberId: "creditor", displayName: "Gaston" },
			],
			splits: [
				{ memberId: "creditor", netAmount: 15000, currency: "ARS" },
				{ memberId: "debtor", netAmount: -15000, currency: "ARS" },
			],
			settlements: [
				{
					fromMemberId: "debtor",
					toMemberId: "creditor",
					amount: 15000,
					currency: "ARS",
				},
			],
		};

		expect(calculateMemberBalance(ledger, "creditor", "ARS")).toBe(0);
		expect(calculateMemberBalance(ledger, "debtor", "ARS")).toBe(0);
	});
});
