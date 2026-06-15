import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { PrismaExpenseRepository } from "./prisma-expense.repository";

describe("PrismaExpenseRepository", () => {
	it("returns null when the group does not exist", async () => {
		const prisma = {
			group: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			groupMember: {
				findMany: vi.fn(),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(repository.findActiveGroupMembers("group-1")).resolves.toBeNull();
		expect(prisma.groupMember.findMany).not.toHaveBeenCalled();
	});

	it("returns the active group members when the group exists", async () => {
		const prisma = {
			group: {
				findFirst: vi.fn().mockResolvedValue({ id: "group-1" }),
			},
			groupMember: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ id: "member-a", displayName: "Gaston" }]),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.findActiveGroupMembers("group-1"),
		).resolves.toEqual([{ id: "member-a", displayName: "Gaston" }]);
	});

	it("wraps member lookup failures in a safe DatabaseException", async () => {
		const prisma = {
			group: {
				findFirst: vi.fn().mockRejectedValue(new Error("raw database failure")),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.findActiveGroupMembers("group-1"),
		).rejects.toMatchObject({
			code: "EXPENSE_GROUP_MEMBERS_DATABASE_ERROR",
			type: "database",
		});
		await expect(
			repository.findActiveGroupMembers("group-1"),
		).rejects.toBeInstanceOf(DatabaseException);
	});

	it("wraps create transaction failures in a safe DatabaseException", async () => {
		const prisma = {
			$transaction: vi.fn().mockRejectedValue(new Error("raw prisma error")),
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(repository.create({} as never)).rejects.toMatchObject({
			code: "EXPENSE_CREATE_DATABASE_ERROR",
			type: "database",
		});
	});

	it("lists non-deleted expenses for an accessible group ordered by expense date and id descending", async () => {
		const prisma = {
			group: {
				findFirst: vi.fn().mockResolvedValue({ id: "group-1" }),
			},
			expense: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "expense-2",
						groupId: "group-1",
						title: "Lunch",
						amount: { toNumber: () => 10000 },
						currency: "ARS",
						paidByMember: { id: "member-a", displayName: "Gaston" },
						_count: { expenseSplits: 2 },
						category: "food",
						expenseDate: new Date("2026-06-14T20:00:00.000Z"),
						createdAt: new Date("2026-06-14T21:00:00.000Z"),
					},
				]),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.listByGroupForUser({
				groupId: "group-1",
				userId: "user-1",
				limit: 20,
			}),
		).resolves.toEqual({
			expenses: [
				{
					id: "expense-2",
					groupId: "group-1",
					title: "Lunch",
					amount: 10000,
					currency: "ARS",
					paidBy: { id: "member-a", displayName: "Gaston" },
					participantsCount: 2,
					category: "food",
					expenseDate: new Date("2026-06-14T20:00:00.000Z"),
					createdAt: new Date("2026-06-14T21:00:00.000Z"),
				},
			],
			nextCursor: null,
		});
		expect(prisma.expense.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { groupId: "group-1", deletedAt: null },
				orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
				take: 21,
			}),
		);
	});

	it("keeps cursor pagination stable for expenses with the same expense date", async () => {
		const expenseDate = new Date("2026-06-14T20:00:00.000Z");
		const prisma = {
			group: {
				findFirst: vi.fn().mockResolvedValue({ id: "group-1" }),
			},
			expense: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "expense-c",
						groupId: "group-1",
						title: "Dinner",
						amount: { toNumber: () => 30000 },
						currency: "ARS",
						paidByMember: { id: "member-a", displayName: "Gaston" },
						_count: { expenseSplits: 2 },
						category: "food",
						expenseDate,
						createdAt: new Date("2026-06-14T22:00:00.000Z"),
					},
					{
						id: "expense-b",
						groupId: "group-1",
						title: "Lunch",
						amount: { toNumber: () => 10000 },
						currency: "ARS",
						paidByMember: { id: "member-a", displayName: "Gaston" },
						_count: { expenseSplits: 2 },
						category: "food",
						expenseDate,
						createdAt: new Date("2026-06-14T21:00:00.000Z"),
					},
				]),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.listByGroupForUser({
				groupId: "group-1",
				userId: "user-1",
				limit: 1,
				cursor: "expense-c",
			}),
		).resolves.toMatchObject({
			expenses: [{ id: "expense-c" }],
			nextCursor: "expense-b",
		});
		expect(prisma.expense.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
				cursor: { id: "expense-c" },
				take: 2,
			}),
		);
	});

	it("returns null when listing expenses for an inaccessible group", async () => {
		const prisma = {
			group: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			expense: {
				findMany: vi.fn(),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.listByGroupForUser({
				groupId: "group-1",
				userId: "user-1",
				limit: 20,
			}),
		).resolves.toBeNull();
		expect(prisma.expense.findMany).not.toHaveBeenCalled();
	});

	it("finds a non-deleted expense detail for an accessible group", async () => {
		const prisma = {
			expense: {
				findFirst: vi.fn().mockResolvedValue({
					id: "expense-1",
					groupId: "group-1",
					title: "Dinner",
					amount: { toNumber: () => 30000 },
					currency: "ARS",
					paidByMember: { id: "member-a", displayName: "Gaston" },
					expenseSplits: [
						{
							memberId: "member-a",
							member: { displayName: "Gaston" },
							owedAmount: { toNumber: () => 15000 },
							paidAmount: { toNumber: () => 30000 },
							netAmount: { toNumber: () => 15000 },
						},
					],
					splitType: "EQUAL",
					category: "food",
					notes: "Pizza night",
					expenseDate: new Date("2026-06-13T20:00:00.000Z"),
					createdAt: new Date("2026-06-13T21:00:00.000Z"),
					updatedAt: new Date("2026-06-13T21:30:00.000Z"),
				}),
			},
		};
		const repository = new PrismaExpenseRepository(prisma as never);

		await expect(
			repository.findDetailByIdForUser({ expenseId: "expense-1", userId: "user-1" }),
		).resolves.toEqual({
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
		expect(prisma.expense.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "expense-1",
					deletedAt: null,
				}),
			}),
		);
	});
});
