import { calculateActiveSince, calculateMeSummaryTotals } from "./me-summary-calculator";

describe("calculateMeSummaryTotals", () => {
	it("returns an empty array when all inputs are empty", () => {
		expect(
			calculateMeSummaryTotals({ paidExpenses: [], splits: [], settlements: [] }),
		).toEqual([]);
	});

	it("keeps mixed currencies separated instead of summing them together", () => {
		expect(
			calculateMeSummaryTotals({
				paidExpenses: [
					{ currency: "USD", amount: 5 },
					{ currency: "USD", amount: 20 },
					{ currency: "ARS", amount: 1000 },
					{ currency: "ARS", amount: 250 },
				],
				splits: [
					{ currency: "USD", netAmount: -10 },
					{ currency: "ARS", netAmount: 500 },
				],
				settlements: [],
			}),
		).toEqual([
			{
				currency: "ARS",
				totalPaid: 1250,
				totalOwed: 0,
				totalToReceive: 500,
			},
			{
				currency: "USD",
				totalPaid: 25,
				totalOwed: 10,
				totalToReceive: 0,
			},
		]);
	});

	it("applies outgoing and incoming settlements with the current sign convention", () => {
		expect(
			calculateMeSummaryTotals({
				paidExpenses: [],
				splits: [{ currency: "ARS", netAmount: 50 }],
				settlements: [
					{ currency: "ARS", amount: 10, direction: "outgoing" },
					{ currency: "ARS", amount: 20, direction: "incoming" },
				],
			}),
		).toEqual([
			{
				currency: "ARS",
				totalPaid: 0,
				totalOwed: 0,
				totalToReceive: 40,
			},
		]);
	});

	it("rounds each monetary contribution to cents using the current boundary behavior", () => {
		expect(
			calculateMeSummaryTotals({
				paidExpenses: [{ currency: "USD", amount: 10.005 }],
				splits: [
					{ currency: "USD", netAmount: -0.004 },
					{ currency: "USD", netAmount: -10.005 },
				],
				settlements: [
					{ currency: "USD", amount: 0.005, direction: "outgoing" },
				],
			}),
		).toEqual([
			{
				currency: "USD",
				totalPaid: 10.01,
				totalOwed: 10,
				totalToReceive: 0,
			},
		]);
	});

	it("derives owed and toReceive from negative and positive net balances", () => {
		expect(
			calculateMeSummaryTotals({
				paidExpenses: [],
				splits: [
					{ currency: "ARS", netAmount: -25 },
					{ currency: "USD", netAmount: 40 },
					{ currency: "EUR", netAmount: 0 },
				],
				settlements: [],
			}),
		).toEqual([
			{
				currency: "ARS",
				totalPaid: 0,
				totalOwed: 25,
				totalToReceive: 0,
			},
			{
				currency: "EUR",
				totalPaid: 0,
				totalOwed: 0,
				totalToReceive: 0,
			},
			{
				currency: "USD",
				totalPaid: 0,
				totalOwed: 0,
				totalToReceive: 40,
			},
		]);
	});
});

describe("calculateActiveSince", () => {
	it("returns null when the membership list is empty", () => {
		expect(calculateActiveSince([])).toBeNull();
	});

	it("returns the single membership date when there is only one membership", () => {
		const date = new Date("2026-01-05T00:00:00.000Z");
		expect(calculateActiveSince([{ createdAt: date }])).toEqual(date);
	});

	it("returns the earliest membership date across multiple memberships", () => {
		const earliest = new Date("2026-01-05T00:00:00.000Z");
		const later = new Date("2026-02-01T00:00:00.000Z");
		const latest = new Date("2026-06-01T00:00:00.000Z");

		expect(
			calculateActiveSince([
				{ createdAt: later },
				{ createdAt: earliest },
				{ createdAt: latest },
			]),
		).toEqual(earliest);
	});
});
