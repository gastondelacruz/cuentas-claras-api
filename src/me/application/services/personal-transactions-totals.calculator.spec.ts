import { calculatePersonalTransactionsTotals } from "./personal-transactions-totals.calculator";

describe("calculatePersonalTransactionsTotals", () => {
	it("returns zero totals for an empty list", () => {
		expect(calculatePersonalTransactionsTotals([])).toEqual({
			incomeTotal: 0,
			expenseTotal: 0,
			total: 0,
		});
	});

	it("sums income and expense transactions separately", () => {
		expect(
			calculatePersonalTransactionsTotals([
				{ type: "income", amount: 1000 },
				{ type: "income", amount: 2500 },
				{ type: "expense", amount: 800 },
			]),
		).toEqual({
			incomeTotal: 3500,
			expenseTotal: 800,
			total: 2700,
		});
	});

	it("handles a filtered subset with only expenses", () => {
		expect(
			calculatePersonalTransactionsTotals([
				{ type: "expense", amount: 1234.56 },
				{ type: "expense", amount: 100 },
			]),
		).toEqual({
			incomeTotal: 0,
			expenseTotal: 1334.56,
			total: -1334.56,
		});
	});

	it("uses cents-safe math to avoid floating point drift", () => {
		expect(
			calculatePersonalTransactionsTotals([
				{ type: "income", amount: 0.1 },
				{ type: "income", amount: 0.2 },
				{ type: "expense", amount: 0.3 },
			]),
		).toEqual({
			incomeTotal: 0.3,
			expenseTotal: 0.3,
			total: 0,
		});
	});
});
