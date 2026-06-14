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
});
