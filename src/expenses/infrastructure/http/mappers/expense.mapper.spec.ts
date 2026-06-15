import { ExpenseEntity } from "../../../domain/entities/expense-entity";
import { Amount } from "../../../domain/value-objects/amount.vo";
import { ExpenseMapper } from "./expense.mapper";

describe("ExpenseMapper", () => {
	it("maps a request dto into a use-case input with a parsed date", () => {
		const input = ExpenseMapper.toInput("group-1", {
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidByMemberId: "member-a",
			participantMemberIds: ["member-a", "member-b"],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: "2026-06-13T20:00:00.000Z",
		});

		expect(input).toEqual({
			groupId: "group-1",
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidByMemberId: "member-a",
			participantMemberIds: ["member-a", "member-b"],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});
	});

	it("defaults optional category and notes to null", () => {
		const input = ExpenseMapper.toInput("group-1", {
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidByMemberId: "member-a",
			participantMemberIds: ["member-a"],
			splitType: "equal",
			expenseDate: "2026-06-13T20:00:00.000Z",
		} as never);

		expect(input.category).toBeNull();
		expect(input.notes).toBeNull();
	});

	it("maps a persisted expense into the response dto with payer details", () => {
		const expense = ExpenseEntity.createWithEqualSplit({
			id: "expense-1",
			groupId: "group-1",
			title: "Dinner",
			amount: new Amount(30000),
			currency: "ARS",
			paidByMemberId: "member-a",
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			participants: [
				{ memberId: "member-a", displayName: "Gaston" },
				{ memberId: "member-b", displayName: "Ana" },
			],
		});

		const response = ExpenseMapper.toCreateResponseDto(
			new ExpenseEntity({
				id: expense.id,
				groupId: expense.groupId,
				title: expense.title,
				amount: expense.amount,
				currency: expense.currency,
				paidByMemberId: expense.paidByMemberId,
				splitType: expense.splitType,
				category: expense.category,
				notes: expense.notes,
				expenseDate: expense.expenseDate,
				splits: expense.splits,
				createdAt: new Date("2026-06-13T21:00:00.000Z"),
				updatedAt: new Date("2026-06-13T21:00:00.000Z"),
			}),
		);

		expect(response).toEqual({
			id: "expense-1",
			groupId: "group-1",
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidBy: {
				id: "member-a",
				displayName: "Gaston",
			},
			participants: [
				{
					memberId: "member-a",
					displayName: "Gaston",
					owedAmount: 15000,
					paidAmount: 30000,
					netAmount: 15000,
				},
				{
					memberId: "member-b",
					displayName: "Ana",
					owedAmount: 15000,
					paidAmount: 0,
					netAmount: -15000,
				},
			],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: "2026-06-13T20:00:00.000Z",
			createdAt: "2026-06-13T21:00:00.000Z",
			updatedAt: "2026-06-13T21:00:00.000Z",
		});
	});

	it("maps a list page into the list response dto", () => {
		const response = ExpenseMapper.toListResponseDto({
			expenses: [
				{
					id: "expense-1",
					groupId: "group-1",
					title: "Dinner",
					amount: 30000,
					currency: "ARS",
					paidBy: { id: "member-a", displayName: "Gaston" },
					participantsCount: 2,
					category: "food",
					expenseDate: new Date("2026-06-13T20:00:00.000Z"),
					createdAt: new Date("2026-06-13T21:00:00.000Z"),
				},
			],
			nextCursor: null,
		});

		expect(response).toEqual({
			expenses: [
				{
					id: "expense-1",
					groupId: "group-1",
					title: "Dinner",
					amount: 30000,
					currency: "ARS",
					paidBy: { id: "member-a", displayName: "Gaston" },
					participantsCount: 2,
					category: "food",
					expenseDate: "2026-06-13T20:00:00.000Z",
					createdAt: "2026-06-13T21:00:00.000Z",
				},
			],
			nextCursor: null,
		});
	});

	it("maps an expense detail projection into the detail response dto", () => {
		const response = ExpenseMapper.toDetailResponseDto({
			id: "expense-1",
			groupId: "group-1",
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidBy: { id: "member-a", displayName: "Gaston" },
			participants: [
				{
					memberId: "member-a",
					displayName: "Gaston",
					owedAmount: 15000,
					paidAmount: 30000,
					netAmount: 15000,
				},
			],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			createdAt: new Date("2026-06-13T21:00:00.000Z"),
			updatedAt: new Date("2026-06-13T21:30:00.000Z"),
		});

		expect(response).toEqual({
			id: "expense-1",
			groupId: "group-1",
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidBy: { id: "member-a", displayName: "Gaston" },
			participants: [
				{
					memberId: "member-a",
					displayName: "Gaston",
					owedAmount: 15000,
					paidAmount: 30000,
					netAmount: 15000,
				},
			],
			splitType: "equal",
			category: "food",
			notes: "Pizza night",
			expenseDate: "2026-06-13T20:00:00.000Z",
			createdAt: "2026-06-13T21:00:00.000Z",
			updatedAt: "2026-06-13T21:30:00.000Z",
		});
	});
});
