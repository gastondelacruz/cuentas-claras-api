import { Amount } from "../value-objects/amount.vo";
import { ExpenseEntity } from "./expense-entity";

describe("ExpenseEntity.createWithEqualSplit", () => {
	const baseProps = {
		id: "expense-1",
		groupId: "group-1",
		title: "Dinner",
		currency: "ARS",
		splitType: "equal" as const,
		category: "food" as string | null,
		notes: "Pizza night" as string | null,
		expenseDate: new Date("2026-06-13T20:00:00.000Z"),
	};

	it("divides the amount equally and assigns the full paid amount to the payer", () => {
		const expense = ExpenseEntity.createWithEqualSplit({
			...baseProps,
			amount: new Amount(30000),
			paidByMemberId: "member-a",
			participants: [
				{ memberId: "member-a", displayName: "Gaston" },
				{ memberId: "member-b", displayName: "Ana" },
			],
		});

		expect(expense.splits).toEqual([
			expect.objectContaining({
				memberId: "member-a",
				displayName: "Gaston",
				owedAmount: 15000,
				paidAmount: 30000,
				netAmount: 15000,
			}),
			expect.objectContaining({
				memberId: "member-b",
				displayName: "Ana",
				owedAmount: 15000,
				paidAmount: 0,
				netAmount: -15000,
			}),
		]);
	});

	it("distributes the remainder cents to the first participants so the split is exact", () => {
		const expense = ExpenseEntity.createWithEqualSplit({
			...baseProps,
			amount: new Amount(100),
			paidByMemberId: "member-a",
			participants: [
				{ memberId: "member-a", displayName: "A" },
				{ memberId: "member-b", displayName: "B" },
				{ memberId: "member-c", displayName: "C" },
			],
		});

		expect(expense.splits.map((split) => split.owedAmount)).toEqual([
			33.34, 33.33, 33.33,
		]);

		const owedTotal = expense.splits.reduce(
			(total, split) => total + split.owedAmount,
			0,
		);
		expect(owedTotal).toBeCloseTo(100, 2);
	});

	it("keeps a single participant owing the full amount with zero net balance", () => {
		const expense = ExpenseEntity.createWithEqualSplit({
			...baseProps,
			amount: new Amount(500),
			paidByMemberId: "member-a",
			participants: [{ memberId: "member-a", displayName: "Solo" }],
		});

		expect(expense.splits).toHaveLength(1);
		expect(expense.splits[0]).toEqual(
			expect.objectContaining({
				memberId: "member-a",
				owedAmount: 500,
				paidAmount: 500,
				netAmount: 0,
			}),
		);
	});

	it("preserves the core expense fields", () => {
		const expense = ExpenseEntity.createWithEqualSplit({
			...baseProps,
			amount: new Amount(30000),
			paidByMemberId: "member-a",
			participants: [{ memberId: "member-a", displayName: "Gaston" }],
		});

		expect(expense.amountValue).toBe(30000);
		expect(expense.title).toBe("Dinner");
		expect(expense.currency).toBe("ARS");
		expect(expense.splitType).toBe("equal");
		expect(expense.category).toBe("food");
		expect(expense.notes).toBe("Pizza night");
	});
});
